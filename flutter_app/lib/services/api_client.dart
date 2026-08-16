import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/app_config.dart';
import 'secure_storage.dart';

class ApiException implements Exception {
  final int statusCode;
  final String message;

  ApiException(this.statusCode, this.message);

  @override
  String toString() => message;
}

class ApiClient {
  final http.Client _client;

  ApiClient({http.Client? client}) : _client = client ?? http.Client();

  Future<Map<String, String>> _getHeaders() async {
    final token = await SecureStorageService.read('authToken');
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'X-Correlation-ID': 'MOB-${DateTime.now().millisecondsSinceEpoch}',
    };
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  String _mapErrorMessage(int statusCode, dynamic body) {
    if (body is Map && body.containsKey('message')) {
      return body['message'];
    }
    switch (statusCode) {
      case 401:
        return 'Session expired. Please log in again.';
      case 403:
        return 'You are not authorized to perform this operation.';
      case 404:
        return 'Requested record was not found.';
      case 409:
        return 'Conflict detected with existing record state.';
      case 429:
        return 'Too many requests. Please wait a moment.';
      case 500:
      case 502:
      case 503:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return 'An error occurred (HTTP $statusCode).';
    }
  }

  Future<dynamic> get(String endpoint) async {
    try {
      final headers = await _getHeaders();
      final url = Uri.parse('${AppConfig.baseUrl}$endpoint');
      final response = await _client.get(url, headers: headers).timeout(AppConfig.apiTimeout);
      return _processResponse(response);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(0, 'Network timeout or connection error. Please check your network.');
    }
  }

  Future<dynamic> post(String endpoint, Map<String, dynamic> body) async {
    try {
      final headers = await _getHeaders();
      final url = Uri.parse('${AppConfig.baseUrl}$endpoint');
      final response = await _client
          .post(url, headers: headers, body: jsonEncode(body))
          .timeout(AppConfig.apiTimeout);
      return _processResponse(response);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(0, 'Network timeout or connection error. Please check your network.');
    }
  }

  dynamic _processResponse(http.Response response) {
    dynamic decoded;
    try {
      decoded = jsonDecode(response.body);
    } catch (_) {
      decoded = response.body;
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return decoded;
    }

    throw ApiException(response.statusCode, _mapErrorMessage(response.statusCode, decoded));
  }
}
