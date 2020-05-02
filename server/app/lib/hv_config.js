import { get } from 'docker-secrets-nodejs';
import dotenv from 'dotenv';

dotenv.config();

export function getConfig(item, def) {
  let value = get(item);
  if (!value) return def;
  return value;
}

export const hv_config = {
  base_uri: getConfig("base_uri", "/api"),
  server_port: getConfig("server_port", 8080),
  server_ssl_port: getConfig("server_ssl_port", 8443),
  server_ssl_key: getConfig("server_ssl_key", null),
  server_ssl_cert: getConfig("server_ssl_cert", null),
  ip_header: getConfig("client_ip_header", null),
  neo4j_host: getConfig("neo4j_host", 'localhost'),
  neo4j_port: getConfig("neo4j_port", 7687),
  neo4j_user: getConfig("neo4j_user", 'neo4j'),
  neo4j_pass: getConfig("neo4j_pass", 'hellovoter'),
  neo4j_jmx_port: getConfig("neo4j_jmx_port", 9999),
  neo4j_jmx_user: getConfig("neo4j_jmx_user", "monitor"),
  neo4j_jmx_pass: getConfig("neo4j_jmx_pass", "Neo4j"),
  enable_geocode: getConfig("enable_geocode", false),
  disable_jmx: getConfig("disable_jmx", false),
  job_concurrency: parseInt(getConfig("job_concurrency", 1)),
  jwt_pub_key: getConfig("jwt_pub_key", null),
  jwt_aud: getConfig("jwt_aud", (process.env.NODE_ENV==='production'?null:'gotv.ourvoiceusa.org')),
  jwt_iss: getConfig("jwt_iss", "ourvoiceusa.org"),
  google_maps_key: getConfig("google_maps_key", null),
  sm_oauth_url: getConfig("sm_oauth_url", 'https://ws.ourvoiceusa.org/auth'),
};

