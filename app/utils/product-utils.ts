import { convertArrayToCSV } from "convert-array-to-csv";
import Papa from "papaparse";

export const fetchAllProducts = async (admin) => {
  const products = [];

  const query = `
    query FetchProducts($limit: Int, $after: String) {
  products(first: $limit, after: $after) {
      nodes {
        id
        title
        handle
        productType
        tags
        totalInventory
        metafields(first: 10) {
          nodes {
            type
            namespace
            key
            value
          }
        }
      }
    pageInfo {
      hasNextPage
      hasPreviousPage
      endCursor
    }
  }
}    
  `;

  let hasNextPage = true;

  const variables = {
    limit: 250,
    after: null,
  };
  do {
    const response = await admin.graphql(query, { variables: variables });
    const data = await response.json();
    if (!data.data.products.pageInfo.hasNextPage) hasNextPage = false;
    const refactoredProducts = data.data.products.nodes.map((p) => {
      const metafields = p.metafields.nodes.reduce((acc, mf) => {
        acc[`Metafield:${mf.namespace}.${mf.key} [${mf.type}]`] = mf.value;
        return acc;
      }, {});

      return {
        id: `'${p.id.split("/").pop()}`,
        handle: p.handle,
        title: p.title,
        type: p.productType,
        tags: p.tags.join(", "),
        total_inventory: p.totalInventory,
        ...metafields,
      };
    });

    products.push(...refactoredProducts); // Push flattened products to the array

    variables.after = data.data.products.pageInfo.endCursor;
  } while (hasNextPage);
  return products;
};

export const generateCSV = (products) => {
  const allHeaders = [...new Set(products.flatMap(Object.keys))];

  const processedData = products.map((row) =>
    allHeaders.reduce((acc, key) => {
      acc[key] = row[key] || ""; // Fill missing fields with empty strings
      return acc;
    }, {}),
  );

  // const headers: string[] = Array.from(
  //   products.reduce((keySet, product) => {
  //     Object.keys(product).forEach((key) => keySet.add(key));
  //     return keySet;
  //   }, new Set()),
  // );
  const config = {
    quotes: false, //or array of booleans
    quoteChar: '"',
    escapeChar: '"',
    delimiter: ",",
    header: true,
    newline: "\r\n",
    skipEmptyLines: false, //other option is 'greedy', meaning skip delimiters, quotes, and whitespace.
  };
  return Papa.unparse(processedData, config);

  // return convertArrayToCSV(products, { header: headers });
};
