import '../services/api_client.dart';
import '../models/approval_model.dart';

class ApprovalRepository {
  final ApiClient _apiClient;

  ApprovalRepository({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  Future<List<ApprovalModel>> getPendingApprovals() async {
    final response = await _apiClient.get('/api/approvals?status=pending');
    final items = response is List ? response : (response['data'] ?? []);
    return (items as List).map((json) => ApprovalModel.fromJson(json)).toList();
  }

  Future<void> approveRequest(String approvalId, {String reason = 'Approved via Mobile'}) async {
    await _apiClient.post('/api/approvals/$approvalId/approve', {'responseReason': reason});
  }

  Future<void> rejectRequest(String approvalId, {String reason = 'Rejected via Mobile'}) async {
    await _apiClient.post('/api/approvals/$approvalId/reject', {'responseReason': reason});
  }
}
