export const generateJSONL = (data) => {
  const jsonl = data
    .map((product) => {
      const metafields = [];
      // Loop through each column (representing a metafield)
      Object.keys(product).forEach((keyField) => {
        if (keyField.startsWith("Metafield:") && product[keyField]) {
          // Extract metafield details from the header name
          const match = keyField.match(/^Metafield:(.*) \[(.*)\]$/);
          if (match) {
            const [_, keyPart, type] = match;
            const namespace = keyPart.split(".")[0];
            const key = keyPart.split(".")[1];

            // Push each metafield as an object
            metafields.push({
              key: key,
              namespace,
              ownerId: `gid://shopify/Product/${product.id.split("'")[1]}`, // Prepend a single quote here
              type,
              value: product[keyField],
            });
          }
        }
      });

      // If the metafields array is empty, return null to exclude this row
      if (metafields.length === 0) return null;

      // Return the JSON structure for JSONL
      return JSON.stringify({ metafields });
    })
    .filter((line) => line !== null) // Filter out null lines
    .join("\n");

  return jsonl;
};
