import pandas as pd
import mygene
import sys
from functools import lru_cache
import re
import time
import argparse

# --- Configuration ---
# File paths are now handled by command-line arguments (argparse) with defaults.
ENSEMBL_ID_COLUMN = "gene_id"
NEW_COLUMN_NAME = "gene_symbol"
# ---------------------


def get_ensembl_stable_id(ensembl_id_with_version):
    """
    Extracts the stable Ensembl ID by removing the version number (e.g., '.14').
    Example: 'ENSG00000166501.14' -> 'ENSG00000166501'
    """
    match = re.match(r"^(ENS[A-Z]{0,3}G\d+)", ensembl_id_with_version)
    if match:
        return match.group(1)
    return ensembl_id_with_version


@lru_cache(maxsize=None)
def lookup_gene_symbol(ensembl_id, mg_client, max_retries=3):
    """
    Looks up the gene symbol using the MyGene.info API with caching.
    Uses exponential backoff for API call retries.
    """
    # 1. Clean the Ensembl ID (remove version if present, although the sample data looks clean)
    clean_id = get_ensembl_stable_id(str(ensembl_id).strip())

    if not clean_id or not clean_id.startswith("ENS"):
        return "N/A"  # Return not available for non-Ensembl-like IDs

    # 2. Query MyGene.info with retries
    for attempt in range(max_retries):
        try:
            # Query for the symbol field based on the Ensembl ID
            res = mg_client.query(clean_id, fields="symbol", species="human", verbose=False)

            if res.get("hits") and len(res["hits"]) > 0:
                # The first hit should contain the gene symbol
                symbol = res["hits"][0].get("symbol")
                return symbol if symbol else "N/A"
            else:
                return "N/A"

        except Exception as e:
            # Handle potential connection or API rate limit errors
            if attempt < max_retries - 1:
                wait_time = 2**attempt
                print(f"[{clean_id}] API error: {e}. Retrying in {wait_time}s...", file=sys.stderr)
                time.sleep(wait_time)
            else:
                print(f"[{clean_id}] Failed after {max_retries} attempts. Error: {e}", file=sys.stderr)
                return "API_ERROR"
    return "N/A"  # Should be caught by the loop, but as a safeguard


def main(input_file, output_file):
    """
    Reads the input TSV, performs gene name lookups, and writes the output TSV.
    """
    print(f"Starting gene symbol lookup for file: {input_file}")

    # 1. Initialize MyGene.info client
    mg = mygene.MyGeneInfo()

    # 2. Read the TSV file using tab as the separator
    try:
        df = pd.read_csv(input_file, sep="\t", skipinitialspace=True)
    except FileNotFoundError:
        print(f"Error: Input file '{input_file}' not found.", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error reading file: {e}", file=sys.stderr)
        sys.exit(1)

    # Ensure the required column exists
    if ENSEMBL_ID_COLUMN not in df.columns:
        print(f"Error: Required column '{ENSEMBL_ID_COLUMN}' not found in the file.", file=sys.stderr)
        print(f"Available columns: {list(df.columns)}", file=sys.stderr)
        sys.exit(1)

    print(f"Successfully read {len(df)} rows.")

    # 3. Apply the lookup function to the Ensembl ID column
    print("Performing gene symbol lookups using MyGene.info API...")

    # Use a lambda to pass the initialized MyGeneInfo client instance
    # The lru_cache decorator on the function handles caching unique queries automatically.
    df[NEW_COLUMN_NAME] = df[ENSEMBL_ID_COLUMN].apply(lambda x: lookup_gene_symbol(x, mg))

    print(f"Lookup complete. New column '{NEW_COLUMN_NAME}' added.")

    # 4. Write the updated DataFrame to a new TSV file
    try:
        df.to_csv(output_file, sep="\t", index=False)
        print(f"Success! Results saved to: {output_file}")
    except Exception as e:
        print(f"Error writing output file: {e}", file=sys.stderr)


if __name__ == "__main__":
    # Use argparse for robust command-line argument handling
    parser = argparse.ArgumentParser(
        description="Add gene symbols to a TSV file using Ensembl IDs and MyGene.info API."
    )

    # Input file argument
    parser.add_argument(
        "-i",
        "--input",
        type=str,
        default="eqtl_catalogue_rsid_rs194810.tsv",
        help="Path to the input TSV file containing Ensembl IDs.",
    )

    # Output file argument
    parser.add_argument(
        "-o",
        "--output",
        type=str,
        default="eqtl_catalogue_with_gene_names.tsv",
        help="Path for the output TSV file with added gene symbols.",
    )

    args = parser.parse_args()

    # Call main with the parsed arguments
    main(args.input, args.output)
