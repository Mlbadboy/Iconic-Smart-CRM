import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state/serial_validation_provider.dart';

class SerialValidationScreen extends StatefulWidget {
  const SerialValidationScreen({super.key});

  @override
  State<SerialValidationScreen> createState() => _SerialValidationScreenState();
}

class _SerialValidationScreenState extends State<SerialValidationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _materialController = TextEditingController();
  final _serialController = TextEditingController();
  final _dealerController = TextEditingController();

  @override
  void dispose() {
    _materialController.dispose();
    _serialController.dispose();
    _dealerController.dispose();
    super.dispose();
  }

  void _validate() {
    if (_formKey.currentState!.validate()) {
      Provider.of<SerialValidationProvider>(context, listen: false).validate(
        _materialController.text,
        _serialController.text,
        _dealerController.text,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final validation = Provider.of<SerialValidationProvider>(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Serial Number Validation')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: ListView(
            children: [
              const Text(
                'Verify Master Registry & Dealer Scope',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _materialController,
                decoration: const InputDecoration(labelText: 'Material Code (e.g. MAT-A)'),
                validator: (v) => v == null || v.trim().isEmpty ? 'Material Code is required' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _serialController,
                decoration: const InputDecoration(labelText: 'Serial Number (e.g. SN-001)'),
                validator: (v) => v == null || v.trim().isEmpty ? 'Serial Number is required' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _dealerController,
                decoration: const InputDecoration(labelText: 'Dealer Code (e.g. DLR-A)'),
                validator: (v) => v == null || v.trim().isEmpty ? 'Dealer Code is required' : null,
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: validation.isLoading ? null : _validate,
                child: validation.isLoading
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text('Validate Serial Number'),
              ),
              const SizedBox(height: 24),
              if (validation.errorMessage != null)
                Card(
                  color: Colors.red.shade50,
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Text('Error: ${validation.errorMessage}', style: const TextStyle(color: Colors.red)),
                  ),
                ),
              if (validation.lastResponse != null) ...[
                Card(
                  color: validation.lastResponse!.canProceed ? Colors.green.shade50 : Colors.orange.shade50,
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(
                              validation.lastResponse!.canProceed ? Icons.check_circle : Icons.cancel,
                              color: validation.lastResponse!.canProceed ? Colors.green : Colors.orange,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'Status: ${validation.lastResponse!.status}',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text('StatusCode: ${validation.lastResponse!.statusCode}'),
                        Text('Verified: ${validation.lastResponse!.valid}'),
                        Text('Can Proceed: ${validation.lastResponse!.canProceed}'),
                        if (validation.lastResponse!.message.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          Text('Message: ${validation.lastResponse!.message}'),
                        ]
                      ],
                    ),
                  ),
                ),
              ]
            ],
          ),
        ),
      ),
    );
  }
}
