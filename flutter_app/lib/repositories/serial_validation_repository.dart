import '../services/api_client.dart';
import '../models/serial_validation_model.dart';

class SerialValidationRepository {
  final ApiClient _apiClient;

  SerialValidationRepository({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  Future<SerialValidationResponse> validateSerial(SerialValidationRequest request) async {
    final response = await _apiClient.post('/api/v1/serial-validation/validate', request.toJson());
    return SerialValidationResponse.fromJson(response);
  }

  Future<List<Map<String, dynamic>>> fetchHistory() async {
    final response = await _apiClient.get('/api/serial-validation/history');
    if (response is List) {
      return List<Map<String, dynamic>>.from(response);
    } else if (response is Map && response['history'] is List) {
      return List<Map<String, dynamic>>.from(response['history']);
    }
    return [];
  }
}
