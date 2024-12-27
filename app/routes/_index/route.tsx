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
          MetaFields Bulk Import/Export
        </h1>

        <p className={styles.text}>
          Have an idea or need assistance with your next big app? Let’s make it
          happen!{" "}
          <Link className="email" to="mailto:sahilshaiikh@hotmail.com">
            sahilshaiikh@hotmail.com
          </Link>
        </p>

        <div className={styles.flex}>
          <Image
            source="MetaFields-bulk-Importer.png"
            alt="Screenshot of MetaFields Bulk Importer"
            width={600}
          />
          <Image
            source="MetaFields-bulk-Importer-2.png"
            alt="Screenshot of MetaFields Bulk Importer"
            width={600}
          />
        </div>

        <ul className={styles.list}>
          <li>
            <strong>Export/Import: </strong>Effortlessly export and import
            metafields from your Shopify store.
          </li>
          <li>
            <strong>Format: </strong>One-click export and bulk import for easy
            formatting.
          </li>
          <li>
            <strong>Custom App: </strong>Need a tailored solution? Request
            access to your custom app.
          </li>
        </ul>

        <footer className={styles.footer}>
          Developed by{" "}
          <Link
            to="https://isahil.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Dev. Sahil
          </Link>
        </footer>
      </div>
    </div>
  );
}
