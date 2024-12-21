import { DataTable, LegacyCard, Page } from "@shopify/polaris";

const sample = [
  ["Emerald Silk Gown", "$875.00", 124689, 140, "$122,500.00"],
  ["Mauve Cashmere Scarf", "$230.00", 124533, 83, "$19,090.00"],
  [
    "Navy Merino Wool Blazer with khaki chinos and yellow belt",
    "$445.00",
    124518,
    32,
    "$14,240.00",
  ],
];

const headings = [
  "ID",
  "Title",
  "Type",
  "Tags",
  "Metafield 1",
  "Metafield 2",
  "Metafield 3",
  "Metafield 4",
  "Metafield 5",
];

export function DataTableComponent({ products, pageInfo }) {
  const productRows = products.edges.map((edge) => {
    const product = {
      id: edge.node.id.split("/").pop(),
      title: edge.node.title,
      type: edge.node.productType,
      tags: edge.node.tags.join(", "),
    };

    // Ensure that every product has the expected number of metafields, even if some are missing
    const metafields = edge.node.metafields.nodes;

    // Loop through and handle the metafields
    for (let idx = 0; idx < 5; idx++) {
      const metafield = metafields[idx];

      // Assign the metafield value or an empty string if missing
      product[`metafield${idx + 1}`] =
        metafield && metafield.key && metafield.value
          ? `${metafield.key} : ${metafield.value}`
          : ""; // Blank if metafield is missing
    }

    return product;
  });

  // Example of transforming productRows into the sample format for Polaris Data Table
  const rows = productRows.map((product) => [...Object.values(product)]);

  return (
    <DataTable
      columnContentTypes={[
        "numeric",
        "text",
        "text",
        "text",
        "text",
        "text",
        "text",
      ]}
      stickyHeader={true}
      hasZebraStripingOnData
      headings={headings}
      rows={rows}
      pagination={{
        hasNext: pageInfo.hasNextPage,
        nextURL: `?after=${pageInfo.endCursor}`,
      }}
    />
  );
}
