import { createTranslationRef } from '@octopus/core-plugin-api';

// Keys mirror the scoped translations the console's namespace module used.
// Default messages are English; other languages can be lazy-loaded later.
export const acpNamespaceTranslationRef = createTranslationRef({
  id: 'acp-cluster-namespace',
  messages: {
    namespaces: 'Namespaces',
    create_namespace: 'Create Namespace',
    delete_namespace: 'Delete Namespace',
    confirm_delete_namespace:
      'Are you sure you want to delete namespace "{{name}}"?',
    namespace_delete_succeeded: 'Namespace deleted successfully',
    namespace_delete_failed: 'Failed to delete namespace',
    detail_info: 'Details',
    resource_quotas: 'Resource Quotas',
    limit_ranges: 'Limit Ranges',
  },
});
