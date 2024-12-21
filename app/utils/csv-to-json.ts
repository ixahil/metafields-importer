import Papa from "papaparse";

export const convertCsvToJsonl = async (
  csvFile: File | null,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!csvFile) {
      return reject("No CSV file provided");
    }

    const reader = new FileReader();

    // Read the file as text (CSV content)
    reader.onload = (event) => {
      if (event.target?.result) {
        const csvString = event.target.result as string;

        // Parse the CSV string using PapaParse
        Papa.parse(csvString, {
          delimiter: ",",
          complete: (result) => {
            // Convert the parsed data to JSONL format
            const jsonl = result.data
              .map((row: any) => JSON.stringify({ input: row }))
              .join("\n");

            console.log("Parsed JSONL:");
            console.log(jsonl);
            resolve(jsonl);
          },
          header: true,
          skipEmptyLines: true,
        });
      } else {
        reject("Failed to read the file");
      }
    };

    reader.onerror = () => reject("Error reading the file");

    // Read the file as text
    reader.readAsText(csvFile);
  });
};
