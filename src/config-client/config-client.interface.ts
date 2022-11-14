export interface ClientRequestOptions {
  endpoint?: string;
  application?: string;
  profile?: string;
  label?: string;
}

export interface CloudConfigResponse {
  name: string;
  profiles: string[];
  label?: string;
  version?: string;
  state?: string;
  propertySources: PropertySource[];
}

export interface ConfigObject {
  [x: string]: any;
}

export interface PropertySource {
  name: string;
  source: ConfigObject;
}
