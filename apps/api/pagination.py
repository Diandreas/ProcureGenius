from rest_framework.pagination import PageNumberPagination


class ProductPagination(PageNumberPagination):
    """Pagination dédiée à la page stock/produits — supporte page_size variable."""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 1000
