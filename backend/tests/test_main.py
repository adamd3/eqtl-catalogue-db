import httpx
import pytest

# Assuming your FastAPI app runs on http://localhost:8001
BASE_URL = "http://localhost:8001"

@pytest.fixture(scope="module")
def client():
    """
    Provides a test client for making requests to the FastAPI application.
    """
    with httpx.Client(base_url=BASE_URL) as client:
        yield client

def test_read_associations_valid_gene(client):
    """
    Test the /associations/ endpoint with a valid gene_name and p_value_threshold.
    """
    gene_name = "RBFA"
    p_value_threshold = 0.05
    response = client.get(f"/associations/?gene_name={gene_name}&p_value_threshold={p_value_threshold}")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0

    # Check structure of one item
    association = data[0]
    assert "id" in association
    assert "pvalue" in association
    assert "beta" in association
    assert "se" in association
    assert "variant" in association
    assert "gene" in association # Assuming gene details are also returned

    assert association["pvalue"] <= p_value_threshold
    assert association["gene"]["gene_name"] == gene_name

def test_read_associations_no_associations(client):
    """
    Test the /associations/ endpoint with a gene_name that has no associations.
    """
    gene_name = "NONEXISTENT_GENE" # Assuming this gene does not exist in the database
    p_value_threshold = 0.05
    response = client.get(f"/associations/?gene_name={gene_name}&p_value_threshold={p_value_threshold}")

    assert response.status_code == 200 # Or 404 if the API returns 404 for no gene found
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 0

def test_read_associations_invalid_pvalue_threshold(client):
    """
    Test the /associations/ endpoint with an invalid p_value_threshold.
    """
    gene_name = "RBFA"
    p_value_threshold = "invalid"
    response = client.get(f"/associations/?gene_name={gene_name}&p_value_threshold={p_value_threshold}")

    assert response.status_code == 422 # FastAPI's validation error status code
    data = response.json()
    assert "detail" in data
    assert "Input should be a valid number, unable to parse string as a number" in data["detail"][0]["msg"]

def test_get_effect_size_valid_ids(client):
    """
    Test the /effect_size/ endpoint with valid variant_id and gene_id obtained from /associations/.
    """
    # First, get a valid association from the /associations/ endpoint
    gene_name_for_lookup = "RBFA"
    p_value_threshold_for_lookup = 0.05
    associations_response = client.get(f"/associations/?gene_name={gene_name_for_lookup}&p_value_threshold={p_value_threshold_for_lookup}")
    assert associations_response.status_code == 200
    associations_data = associations_response.json()
    assert len(associations_data) > 0

    # Extract a valid variant_id and gene_id from the first association
    first_association = associations_data[0]
    variant_id = first_association["variant"]["variant_id"]
    gene_id = first_association["gene"]["gene_id"]

    # Now, test the /effect_size/ endpoint with these valid IDs
    response = client.get(f"/effect_size/?variant_id={variant_id}&gene_id={gene_id}")

    assert response.status_code == 200
    data = response.json()

    assert "beta" in data
    assert "se" in data
    assert "variant" in data
    assert "gene" in data

    assert data["variant"]["variant_id"] == variant_id
    assert data["gene"]["gene_id"] == gene_id

def test_get_effect_size_not_found(client):
    """
    Test the /effect_size/ endpoint with non-existent variant_id and gene_id.
    """
    variant_id = "NONEXISTENT_VARIANT"
    gene_id = "NONEXISTENT_GENE"
    response = client.get(f"/effect_size/?variant_id={variant_id}&gene_id={gene_id}")

    assert response.status_code == 404
    data = response.json()
    assert "detail" in data
    assert data["detail"] == "Effect size not found for the given variant and gene."
