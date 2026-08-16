import '../services/api_client.dart';
import '../models/customer_model.dart';

class CustomerRepository {
  final ApiClient _apiClient;

  CustomerRepository({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  Future<List<CustomerModel>> getCustomers({String? search, int limit = 20}) async {
    final endpoint = search != null && search.isNotEmpty
        ? '/api/retailers?search=$search&limit=$limit'
        : '/api/retailers?limit=$limit';

    final response = await _apiClient.get(endpoint);
    final items = response is Map && response['retailers'] is List
        ? response['retailers']
        : (response is List ? response : []);

    return (items as List).map((json) => CustomerModel.fromJson(json)).toList();
  }

  Future<Map<String, dynamic>> getCustomer360(String customerId) async {
    final response = await _apiClient.get('/api/v1/customers/$customerId');
    return Map<String, dynamic>.from(response);
  }
}
