import { Link } from 'react-router-dom';
import { ApartmentOutlined } from '@ant-design/icons';

// A single anchor (the router Link); AntD's global reset gives it the link
// colour. Wrapping it in `Typography.Link` would nest <a> inside <a>.
export function PipelineBreadcrumb({ to = '..' }: { to?: string }) {
  return (
    <Link to={to}>
      <ApartmentOutlined /> Pipelines
    </Link>
  );
}
