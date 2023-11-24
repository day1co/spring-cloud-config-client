export interface ClientRequestOptions {
  endpoint?: string;
  application?: string;
  profile?: string;
  label?: string;
}

export interface CloudConfigSuccessResponse {
  name: string;
  profiles: string[];
  label?: string;
  version?: string;
  state?: string;
  propertySources: PropertySource[];
}

export interface CloudConfigErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  path: string;
}

export type CloudConfigResponse = CloudConfigSuccessResponse | CloudConfigErrorResponse;

export interface ConfigObject {
  [x: string]: any;
}

export interface PropertySource {
  name: string;
  source: ConfigObject;
}
