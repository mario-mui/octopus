/*
 * Internal routing for the namespace plugin. The plugin contributes a single
 * routable page (the cluster-view "Namespaces" entry) and owns the
 * list/create/detail/update split itself.
 *
 *   index         → list    (…/namespaces)
 *   create        → create  (…/namespaces/create)
 *   detail/:name  → detail  (…/namespaces/detail/:name)
 *   update/:name  → update  (…/namespaces/update/:name)
 */
import { Routes, Route } from 'react-router-dom';
import { NamespaceListPage } from './NamespaceListPage';
import { NamespaceDetailPage } from './NamespaceDetailPage';
import { NamespaceCreatePage } from './NamespaceCreatePage';
import { NamespaceUpdatePage } from './NamespaceUpdatePage';

export function NamespaceRoutes() {
  return (
    <Routes>
      <Route index element={<NamespaceListPage />} />
      <Route path="create" element={<NamespaceCreatePage />} />
      <Route path="detail/:name" element={<NamespaceDetailPage />} />
      <Route path="update/:name" element={<NamespaceUpdatePage />} />
    </Routes>
  );
}
