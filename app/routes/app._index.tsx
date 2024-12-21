import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import {
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData,
} from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import {
  Badge,
  BlockStack,
  Button,
  Card,
  Divider,
  EmptyState,
  Icon,
  InlineStack,
  Layout,
  Link,
  Page,
  Spinner,
  Text,
} from "@shopify/polaris";
import { FileDrop } from "app/components/file-drop";
import { authenticate } from "app/shopify.server";
import { generateJSONL } from "app/utils/jsonl-generator";
import { convertArrayToCSV } from "convert-array-to-csv";
import type { ParseResult } from "papaparse";
import Papa from "papaparse";
import { useEffect, useState } from "react";
import { ImportIcon } from "@shopify/polaris-icons";
import { PrismaClient } from "@prisma/client";
import { fetchAllProducts, generateCSV } from "app/utils/product-utils";

type JsonParsed = {
  [key: string]: any;
};

const db = new PrismaClient();
const fileName = "products_metafields_import";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  try {
    // Fetching only the imports that have a "running" status
    const importsToUpdate = await db.imports.findMany({
      where: {
        status: "RUNNING",
      },
    });

    // If no imports are found with status "running", skip further processing
    if (importsToUpdate.length === 0) {
      const importsData = await db.imports.findMany();
      return { importsData };
    }

    // Gather all necessary update operations in parallel for "running" imports
    const updatePromises = importsToUpdate.map(async (item) => {
      const response = await admin.graphql(
        `
          query GetBulkOperation($id: ID!) {
            node(id: $id) {
              ... on BulkOperation {
                errorCode
                id
                status
                objectCount
              }
            }
          }
          `,
        {
          variables: {
            id: `gid://shopify/BulkOperation/${item.opId}`,
          },
        },
      );

      const data = await response.json();

      if (data.data?.node) {
        // Only update the status if it's different or a change is necessary
        return db.imports.update({
          where: { id: item.id },
          data: { status: data.data.node.status },
        });
      }
    });

    // Wait for all the updates to complete
    await Promise.all(updatePromises);

    // Fetch the updated imports to return after update
    const updatedImports = await db.imports.findMany();
    return { importsData: updatedImports };
  } catch (error) {
    console.error("Error in fetching and updating imports:", error);
    return { importsData: [] };
  }
};

// Action function to handle form submission and file processing
export const action = async ({ request }: ActionFunctionArgs) => {
  const uploadHandler = unstable_createMemoryUploadHandler();

  const formData = await unstable_parseMultipartFormData(
    request,
    uploadHandler,
  );

  const _action = formData.get("_action");
  const { admin } = await authenticate.admin(request);

  switch (_action) {
    case "export":
      const products = await fetchAllProducts(admin);
      const csv = generateCSV(products);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/plain",
        },
      });
    case "import":
      const stageUploadCreateResponse = await admin.graphql(
        `#graphql
        mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
          stagedUploadsCreate(input: $input) {
            stagedTargets {
              url
              resourceUrl
              parameters {
                name
                value
              }
            }
          }
        }`,
        {
          variables: {
            input: [
              {
                filename: fileName,
                mimeType: "text/jsonl",
                httpMethod: "POST",
                resource: "BULK_MUTATION_VARIABLES",
              },
            ],
          },
        },
      );
      const stageUploadCreateData = await stageUploadCreateResponse.json();

      const resourceParams =
        stageUploadCreateData.data.stagedUploadsCreate.stagedTargets[0]
          .parameters;

      const resourceFormData = new FormData();
      let resourceKeyPath;

      resourceParams.map((param) => {
        resourceFormData.append(param.name, param.value);
        if (param.name == "key") resourceKeyPath = param.value;
      });
      resourceFormData.append("file", formData.get("file") as Blob);
      try {
        const uploadResourceResponse = await fetch(
          "https://shopify-staged-uploads.storage.googleapis.com/",
          {
            method: "POST",
            body: resourceFormData,
          },
        );
      } catch (error) {
        console.log(error);
      }

      const bulkOperationRunMutation = await admin.graphql(
        `
          mutation bulkOperationRunMutation($clientIdentifier: String, $mutation: String!, $stagedUploadPath: String!) {
          bulkOperationRunMutation(clientIdentifier: $clientIdentifier, mutation: $mutation, stagedUploadPath: $stagedUploadPath) {
            bulkOperation {
              id,
              status,
              url
            }
            userErrors {
              field
              message
            }
          }
        }
        `,
        {
          variables: {
            clientIdentifier: `import-metafields_product-metafields_import-${Date.now()}`,
            mutation:
              "mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $metafields) { metafields { key namespace value createdAt updatedAt } userErrors { field message code } } }",
            stagedUploadPath: resourceKeyPath,
          },
        },
      );

      const bulkOperationRunMutationData =
        await bulkOperationRunMutation.json();
      if (
        bulkOperationRunMutationData.data.bulkOperationRunMutation.bulkOperation
          .id
      ) {
        await db.imports.create({
          data: {
            count: Number(formData.get("lineCount")),
            opId: bulkOperationRunMutationData.data.bulkOperationRunMutation.bulkOperation.id
              .split("/")
              .pop(),
          },
        });
      }
      return { _action: "import" };
  }
};

interface State {
  download: string | null;
  importIsLoading: boolean;
}

// Component to handle file uploads and data display
export default function Index() {
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const shopify = useAppBridge();

  const [state, setState] = useState<State>({
    download: null,
    importIsLoading: false,
  });

  const loaderData = useLoaderData<typeof loader>();

  const exportFetcher = useFetcher<typeof action>();
  const importFetcher = useFetcher<typeof action>();

  const ExportIsLoading =
    ["loading", "submitting"].includes(exportFetcher.state) &&
    exportFetcher.formMethod === "POST";

  useEffect(() => {
    if (importFetcher.data?._action == "import") {
      shopify.toast.show(
        "Process Created Successfully, it would take some time to complete",
      );
      setFile(null);
      setState((prevState) => ({ ...prevState, importIsLoading: false }));
      return;
    }
    if (exportFetcher.data) {
      shopify.toast.show("Exporting...");
      const csv = exportFetcher.data;
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      setState((prevState) => ({ ...prevState, download: url }));
      return;
    }
  }, [exportFetcher.data, importFetcher.data, shopify]);

  const handleDownloadTemplate = () => {
    const formData = new FormData();
    formData.append("_action", "export");
    exportFetcher.submit(formData, {
      method: "POST",
      encType: "multipart/form-data",
    });
  };

  const handleSubmit = async () => {
    setState((prevState) => ({ ...prevState, importIsLoading: true }));
    shopify.toast.show("Bulk Process Creating");
    try {
      if (!file) {
        setError("No file selected");
        shopify.toast.show("No file selected");
        return;
      }

      const config = {
        header: true,
        complete: (result: ParseResult<JsonParsed>) => {
          const jsonl = generateJSONL(result.data);
          const newFile = new File([jsonl], `${file.name}.jsonl`, {
            type: "application/jsonl",
          });

          const lineCount = jsonl.length;
          if (!lineCount) {
            shopify.toast.show("Invalid File, or no metafields found");
            setFile(null);
            setError("Invalid File, or no metafields found");

            setState((prevState) => ({ ...prevState, importIsLoading: false }));
            return;
          }
          setError(null);
          const formData = new FormData();
          formData.append("lineCount", String(lineCount));
          formData.append("file", newFile);
          formData.append("_action", "import");

          importFetcher.submit(formData, {
            method: "POST",
            encType: "multipart/form-data",
          });
        },
        error: (error: Error) => {
          console.error("Parsing error:", error.message);
          setError(`Parsing error: ${error.message}`);
        },
      };

      Papa.parse(file, config);
    } catch (error) {
      console.log(error);
      setError(`Parsing error: ${error}`);
      setState((prevState) => ({ ...prevState, importIsLoading: false }));
    }
  };

  return (
    <Page>
      <TitleBar title="Metafields Imports" />
      <BlockStack gap="500">
        <Layout sectioned>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <InlineStack align="space-between">
                  <Text as="h3" variant="headingMd">
                    Upload XLSX or CSV
                  </Text>
                  <InlineStack gap={"400"} align="center" blockAlign="center">
                    <Text as="h3" variant="headingMd">
                      Download your export template with prefilled id and
                      handles?
                    </Text>
                    {state.download ? (
                      <a
                        href={state.download}
                        download={`${shopify.config.shop}_metafields_export.csv`}
                      >
                        Download File
                      </a>
                    ) : (
                      <Button
                        disabled={ExportIsLoading}
                        onClick={handleDownloadTemplate}
                        variant="primary"
                        loading={ExportIsLoading}
                      >
                        Generate Export
                      </Button>
                    )}
                  </InlineStack>
                </InlineStack>
                {file ? (
                  <FileDetails file={file} isLoading={state.importIsLoading} />
                ) : (
                  <FileDrop file={file} setFile={setFile} />
                )}
                {error && <Badge tone="critical">{error}</Badge>}
                <InlineStack gap={"500"}>
                  <Button
                    disabled={!file}
                    variant="primary"
                    onClick={handleSubmit}
                    loading={state.importIsLoading}
                  >
                    Submit
                  </Button>
                  <Button
                    disabled={!file}
                    variant="secondary"
                    onClick={() => setFile(null)}
                  >
                    Reset
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section>
            <Card>
              View your products with Metafields{" "}
              <Link url="/app/products">View Products</Link>
            </Card>
          </Layout.Section>
          <Layout.Section>
            <Card>
              <BlockStack gap={"500"}>
                <Text as="h3" variant="headingMd">
                  All Imports
                </Text>
                <BlockStack gap={"1000"}>
                  {loaderData.importsData.length == 0 && <EmptyImportList />}
                  {loaderData.importsData.map((data) => (
                    <BlockStack key={data.id}>
                      <div style={{ padding: "15px 0" }}>
                        <InlineStack gap={"1000"} blockAlign="stretch">
                          <BlockStack
                            gap={"200"}
                            align="center"
                            inlineAlign="center"
                          >
                            <div
                              style={{
                                padding: "15px",
                                background: "#D3D5DD",
                                borderRadius: "100%",
                              }}
                            >
                              <Icon source={ImportIcon} tone="info" />
                            </div>
                            <Text as="p" variant="bodyLg">
                              Import
                            </Text>
                            <Badge tone="info">{`#${data.id}`}</Badge>
                          </BlockStack>
                          <BlockStack
                            gap={"200"}
                            align="start"
                            inlineAlign="start"
                          >
                            <Text as="p" variant="headingMd">
                              Products
                            </Text>
                            <Badge tone="success">{String(data.count)}</Badge>
                            <Text as="p" variant="bodyMd">
                              {data.date}
                            </Text>
                            <Text as="p" variant="bodyMd">
                              OPID: {`#${data.opId}`}
                            </Text>
                          </BlockStack>
                          <div style={{ marginLeft: "auto" }}>
                            <BlockStack
                              gap={"200"}
                              align="end"
                              inlineAlign="end"
                            >
                              <Badge>Products</Badge>
                              <Badge tone="success">
                                {String(data.status)}
                              </Badge>
                            </BlockStack>
                          </div>
                        </InlineStack>
                      </div>
                      <Divider borderColor="border" />
                    </BlockStack>
                  ))}
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

const FileDetails = ({
  file,
  isLoading,
}: {
  file: File;
  isLoading: boolean;
}) => {
  return isLoading ? (
    <BlockStack align="center" inlineAlign="center">
      <Spinner accessibilityLabel="Spinner example" size="large" />
    </BlockStack>
  ) : (
    <BlockStack gap="200">
      <Text as="h3" variant="headingLg">
        {file.name}
      </Text>
      <Text as="p" variant="bodyLg">
        {file.type}
      </Text>
      <Text as="p" variant="bodyLg">
        {file.size / 1024} KB
      </Text>
    </BlockStack>
  );
};

const EmptyImportList = () => (
  <EmptyState
    heading="Create New Import by Exporting the Product List"
    image="https://cdn.shopify.com/s/files/1/0671/5359/2571/files/download_1.svg?v=1734772119"
    imageContained
    largeImage="https://cdn.shopify.com/s/files/1/0671/5359/2571/files/download_1.svg?v=1734772119"
  >
    <p>
      For More Details Instruction - <Link url="faq">Go to FAQ</Link>
    </p>
  </EmptyState>
);
