import '../services/api_client.dart';
import '../services/secure_storage.dart';
import '../models/user_model.dart';

class AuthRepository {
  final ApiClient _apiClient;

  AuthRepository({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  Future<UserModel> login(String email, String password) async {
    final response = await _apiClient.post('/api/auth/login', {
      'email': email,
      'password': password,
    });

    final user = UserModel.fromJson(response);
    if (user.token != null) {
      await SecureStorageService.write('authToken', user.token!);
      await SecureStorageService.write('userId', user.id);
      await SecureStorageService.write('userRole', user.role);
    }
    return user;
  }

  Future<void> logout() async {
    try {
      await _apiClient.post('/api/auth/logout', {});
    } catch (_) {}
    await SecureStorageService.deleteAll();
  }

  Future<bool> isAuthenticated() async {
    final token = await SecureStorageService.read('authToken');
    return token != null && token.isNotEmpty;
  }
}
