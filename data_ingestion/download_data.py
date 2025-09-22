import ftplib
import os
import io
import pandas as pd
from ftplib import FTP


def download_file(ftp_session, remote_path, local_path):
    """
    Downloads a single file from the FTP server.

    Args:
        ftp_session (ftplib.FTP): The active FTP session.
        remote_path (str): The path to the file on the remote server.
        local_path (str): The local path to save the file.
    """
    try:
        print(f"Downloading {remote_path} to {local_path}...")
        with open(local_path, "wb") as local_file:
            ftp_session.retrbinary("RETR " + remote_path, local_file.write)
        print("Download successful.")
    except ftplib.all_errors as e:
        print(f"Error downloading file: {e}")


def main():
    """
    Connects to the EBI FTP server and downloads all macrophage datasets.
    """
    # EBI FTP server details
    host = "ftp.ebi.ac.uk"

    # Paths to the data directories
    sumstats_dir = "/pub/databases/spot/eQTL/sumstats/"

    # Local directory to save the files
    local_dir = "data"
    if not os.path.exists(local_dir):
        os.makedirs(local_dir)
        print(f"Created local directory: {local_dir}")

    # Choose between downloading full summary statistics (.all.tsv.gz)
    # or the filtered credible set files (.cc.tsv.gz).
    # The .cc files are significantly smaller and recommended for local laptops.
    file_suffix = ".cc.tsv.gz"
    # To download all files, change the line above to:
    # file_suffix = '.all.tsv.gz'

    try:
        print(f"Connecting to FTP server at {host}...")
        with FTP(host) as ftp:
            ftp.login()
            print("Login successful.")

            # Step 1: Download and parse the metadata file to find Macrophage datasets
            metadata_url = "https://raw.githubusercontent.com/eQTL-Catalogue/eQTL-Catalogue-resources/master/data_tables/dataset_metadata.tsv"
            print(f"Downloading metadata from {metadata_url}...")
            metadata_df = pd.read_csv(metadata_url, sep="\t")
            print("Metadata downloaded and parsed successfully.")

            # Step 2: Filter for macrophage datasets
            macrophage_datasets = metadata_df[metadata_df["qtl_group"].str.contains("macrophage", case=False, na=False)]

            if macrophage_datasets.empty:
                print("No macrophage datasets found in the metadata.")
                return

            print(f"Found {len(macrophage_datasets)} macrophage datasets.")

            # Step 3: Download the corresponding summary statistics files
            ftp.cwd(sumstats_dir)
            print(f"Changed to directory: {sumstats_dir}")

            for _, row in macrophage_datasets.iterrows():
                study_id = row["study_id"]
                dataset_id = row["dataset_id"]

                # The file structure is sumstats/<study_id>/<dataset_id>/<dataset_id>.<suffix>
                remote_file_path = f"{study_id}/{dataset_id}/{dataset_id}{file_suffix}"
                local_file_path = os.path.join(local_dir, f"{dataset_id}{file_suffix}")

                download_file(ftp, remote_file_path, local_file_path)

    except ftplib.all_errors as e:
        print(f"FTP error: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")


if __name__ == "__main__":
    main()
