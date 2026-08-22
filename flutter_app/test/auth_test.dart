import 'package:flutter_test/flutter_test.dart';
import '../lib/models/user_model.dart';

void main() {
  group('UserModel Test Suite', () {
    test('UserModel.fromJson parses authentication token and user profile correctly', () {
      final json = {
        'token': 'jwt_mock_token_12345',
        'user': {
          'id': 'user_001',
          'name': 'Shubham Kumar',
          'email': 'shubham.kumar@charlieai.com',
          'role': 'sales'
        }
      };

      final user = UserModel.fromJson(json);

      expect(user.id, equals('user_001'));
      expect(user.name, equals('Shubham Kumar'));
      expect(user.email, equals('shubham.kumar@charlieai.com'));
      expect(user.role, equals('sales'));
      expect(user.token, equals('jwt_mock_token_12345'));
    });
  });
}
