/*
 * The "Namespaces" breadcrumb shown atop the detail/create/update pages. Links
 * back to the list, which is always the parent route (`..`).
 */
import { Link } from 'react-router-dom';
import { Typography } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';

export function NamespaceBreadcrumb() {
  return (
    <Typography.Link>
      <Link to="..">
        <AppstoreOutlined /> Namespaces
      </Link>
    </Typography.Link>
  );
}
