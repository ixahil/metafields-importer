import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { TitleBar } from "@shopify/app-bridge-react";
import {
  Badge,
  BlockStack,
  Button,
  Card,
  InlineStack,
  Layout,
  Page,
} from "@shopify/polaris";
import { DataTableComponent } from "app/components/data-table";
import { authenticate } from "app/shopify.server";
import { fetchAllProducts, generateCSV } from "app/utils/product-utils";
import { useEffect, useState } from "react";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const url = new URL(request.url);
  const query = `
      query FetchProducts($limit: Int, $after: String) {
  products(first: $limit, after: $after) {
    edges {
      cursor
      node {
        id
        title
        handle
        productType
        tags
        metafields(first: 10) {
          nodes {
            key
            value
          }
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
  }`;

  const variables = {
    limit: 50,
    after: url.searchParams.get("after") || null,
  };

  const response = await admin.graphql(query, { variables: variables });

  const data = await response.json();
  return { products: data.data.products };
};

type Props = {};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const products = await fetchAllProducts(admin);
  const csv = generateCSV(products);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
};

export const Products = (props: Props) => {
  const [downloadFile, setDownloadFile] = useState<string | null>(null);
  const loaderData = useLoaderData<typeof loader>();

  const exportFetcher = useFetcher<typeof action>();

  const navigate = useNavigate();

  const ExportIsLoading = ["loading", "submitting"].includes(
    exportFetcher.state,
  );

  useEffect(() => {
    if (exportFetcher.data) {
      shopify.toast.show("Exporting...");
      const csv = exportFetcher.data;
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      setDownloadFile(url);
      return;
    }
  }, [exportFetcher]);

  const handleDownloadTemplate = () => {
    const formData = new FormData();
    formData.append("_action", "export");
    exportFetcher.submit(formData, {
      method: "POST",
      encType: "multipart/form-data",
    });
  };

  return (
    <Page
      fullWidth
      backAction={{ content: "Import", url: "../" }}
      title="Products with Metafields"
    >
      <ui-title-bar title={"Products"}>
        <button variant="breadcrumb" onClick={() => navigate("/app")}>
          Imports
        </button>
      </ui-title-bar>
      <TitleBar title="Imports / Products" />
      <Layout sectioned>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <InlineStack align="end" gap={"500"}>
                <Badge tone="attention-strong">
                  Export might take a while to generate, totally depends on
                  total amount of products
                </Badge>
                {downloadFile ? (
                  <a
                    href={downloadFile}
                    download={`${shopify.config.shop}_metafields_export.csv`}
                  >
                    Download File
                  </a>
                ) : (
                  <Button
                    variant="primary"
                    onClick={handleDownloadTemplate}
                    loading={ExportIsLoading}
                    disabled={ExportIsLoading}
                  >
                    Generate Export
                  </Button>
                )}
              </InlineStack>
              <BlockStack gap="500">
                {loaderData && (
                  <DataTableComponent
                    products={loaderData.products}
                    pageInfo={loaderData.products.pageInfo}
                  />
                )}
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
};

export default Products;
