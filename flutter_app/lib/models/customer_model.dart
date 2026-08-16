class CustomerModel {
  final String id;
  final String retailerName;
  final String ownerName;
  final String phone;
  final String email;
  final String city;
  final String state;
  final String status;

  CustomerModel({
    required this.id,
    required this.retailerName,
    required this.ownerName,
    required this.phone,
    required this.email,
    required this.city,
    required this.state,
    required this.status,
  });

  factory CustomerModel.fromJson(Map<String, dynamic> json) {
    return CustomerModel(
      id: json['_id'] ?? json['id'] ?? '',
      retailerName: json['retailerName'] ?? json['name'] ?? '',
      ownerName: json['ownerName'] ?? json['contactPerson'] ?? '',
      phone: json['phone'] ?? '',
      email: json['email'] ?? '',
      city: json['city'] ?? '',
      state: json['state'] ?? '',
      status: json['status'] ?? 'Active',
    );
  }
}
