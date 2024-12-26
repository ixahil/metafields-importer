import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, Link, useLoaderData } from "@remix-run/react";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";
import { Image } from "@shopify/polaris";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>
          <Image source="logo.webp" alt="logo" width={48} height={48} />
          MetaFilds Bulk Import/Export
        </h1>
        <p className={styles.text}>
          Email me If you need to access or need develop any other app -
          <Link className="email" to={"sahilshaiikh@hotmail.com"}>
            sahilshaiikh@hotmail.com
          </Link>
        </p>
        <div className={styles.flex}>
          <Image
            source="MetaFields-bulk-Importer.png"
            alt="screencapture"
            width={500}
          />
          <Image
            source="MetaFields-bulk-Importer-2.png"
            alt="screencapture"
            width={500}
          />
        </div>
        <ul className={styles.list}>
          <li>
            <strong>Export/Import: </strong>Easy Export/Import Metafields from
            your shopify
          </li>
          <li>
            <strong>Format: </strong>Easy format 1 Click Export and Bulk Import
          </li>
          <li>
            <strong>Custom App: </strong>Custom App - Request for access
          </li>
        </ul>
        <footer className={styles.footer}>
          Developed by{" "}
          <Link to={"https://isahil.vercel.app/"}>Dev. Sahil </Link>
        </footer>
      </div>
    </div>
  );
}
