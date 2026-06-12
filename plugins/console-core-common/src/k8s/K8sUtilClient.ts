/*
 * Resource metadata helpers, as a class. The framework-agnostic subset of the
 * console SDK's Angular `K8sUtilService`: reading names, timestamps, and the
 * platform's domain-qualified annotation/label conventions. Pure — no `fetch`,
 * no injected deps. The dialog/notification-coupled methods stay in the React
 * UI layer.
 *
 * Platform annotations/labels are namespaced by a base domain, e.g.
 * `cpaas.io/display-name`. The console resolves it from the `LABEL_BASE_DOMAIN`
 * runtime env (default `cpaas.io`); here the class carries the same default,
 * overridable via the constructor or per call.
 */

import type { KubernetesResource } from '../types';

/** Default annotation/label base domain (`LABEL_BASE_DOMAIN`). */
export const LABEL_BASE_DOMAIN = 'cpaas.io';

const SPACE = ' ';

/** Annotation/label key suffixes used by the platform conventions. */
export const DISPLAY_NAME = 'display-name';
export const DESCRIPTION = 'description';
export const CREATOR = 'creator';
export const UPDATED_AT = 'updated-at';
export const PROJECT = 'project';

export class K8sUtilClient {
  constructor(private readonly baseDomain: string = LABEL_BASE_DOMAIN) {}

  /**
   * Build a domain-qualified annotation/label key, e.g.
   * `normalizeType('display-name')` → `cpaas.io/display-name`,
   * `normalizeType('name', 'foo')` → `foo.cpaas.io/name`.
   */
  normalizeType(type: string, prefix?: string, baseDomain?: string): string {
    return `${prefix ? `${prefix}.` : ''}${baseDomain ?? this.baseDomain}/${type}`;
  }

  getName(resource?: KubernetesResource): string | undefined {
    return resource?.metadata?.name;
  }

  getNamespace(resource?: KubernetesResource): string | undefined {
    return resource?.metadata?.namespace;
  }

  getCreationTimestamp(resource?: KubernetesResource): string | undefined {
    return resource?.metadata?.creationTimestamp;
  }

  getAnnotation(
    resource: KubernetesResource | undefined,
    type: string,
    prefix?: string,
    baseDomain?: string,
  ): string | undefined {
    return resource?.metadata?.annotations?.[
      this.normalizeType(type, prefix, baseDomain)
    ];
  }

  getLabel(
    resource: KubernetesResource | undefined,
    type: string,
    prefix?: string,
    baseDomain?: string,
  ): string | undefined {
    return resource?.metadata?.labels?.[
      this.normalizeType(type, prefix, baseDomain)
    ];
  }

  getDisplayName(
    resource?: KubernetesResource,
    prefix?: string,
    baseDomain?: string,
  ): string | undefined {
    return this.getAnnotation(resource, DISPLAY_NAME, prefix, baseDomain);
  }

  /**
   * The name followed by a parenthesised display name when present, e.g.
   * `my-ns (My Namespace)`. Mirrors `getUnionDisplayName`.
   */
  getUnionDisplayName(
    resource?: KubernetesResource,
    namePrefix?: string | false,
    displayNamePrefix?: string,
    baseDomain?: string,
  ): string | undefined {
    if (!resource) {
      return undefined;
    }
    const name =
      (namePrefix !== false &&
        this.getAnnotation(
          resource,
          'name',
          namePrefix || undefined,
          baseDomain,
        )) ||
      this.getName(resource);
    const displayName = this.getDisplayName(
      resource,
      displayNamePrefix,
      baseDomain,
    );
    return `${name ?? ''}${displayName ? `${SPACE}(${displayName})` : ''}`;
  }

  getDescription(
    resource?: KubernetesResource,
    prefix?: string,
    baseDomain?: string,
  ): string | undefined {
    return this.getAnnotation(resource, DESCRIPTION, prefix, baseDomain);
  }

  getCreator(
    resource?: KubernetesResource,
    prefix?: string,
    baseDomain?: string,
  ): string | undefined {
    return this.getAnnotation(resource, CREATOR, prefix, baseDomain);
  }

  getUpdatedAt(
    resource?: KubernetesResource,
    prefix?: string,
    baseDomain?: string,
  ): string | undefined {
    return this.getAnnotation(resource, UPDATED_AT, prefix, baseDomain);
  }

  getProject(
    resource?: KubernetesResource,
    baseDomain?: string,
  ): string | undefined {
    return this.getLabel(resource, PROJECT, undefined, baseDomain);
  }
}
