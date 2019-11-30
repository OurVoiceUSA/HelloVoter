
import dotenv from 'dotenv';
import { getConfig } from 'ourvoiceusa-sdk-js';

dotenv.config();

export const ov_config = {
  server_port: getConfig("server_port", false, 8080),
  server_ssl_port: getConfig("server_ssl_port", false, 8443),
  server_ssl_key: getConfig("server_ssl_key", false, null),
  server_ssl_cert: getConfig("server_ssl_cert", false, null),
  ip_header: getConfig("client_ip_header", false, null),
  neo4j_host: getConfig("neo4j_host", false, 'localhost'),
  neo4j_port: getConfig("neo4j_port", false, 7687),
  neo4j_user: getConfig("neo4j_user", false, 'neo4j'),
  neo4j_pass: getConfig("neo4j_pass", false, 'hellovoter'),
  neo4j_jmx_port: getConfig("neo4j_jmx_port", false, 9999),
  neo4j_jmx_user: getConfig("noej4_jmx_user", false, "monitor"),
  neo4j_jmx_pass: getConfig("noej4_jmx_pass", false, "Neo4j"),
  disable_jmx: getConfig("disable_jmx", false, false),
  disable_apoc: getConfig("disable_apoc", false, false),
  disable_spatial: getConfig("disable_spatial", false, false),
  job_concurrency: parseInt(getConfig("job_concurrency", false, 1)),
  jwt_pub_key: getConfig("jwt_pub_key", false, null),
  jwt_iss: getConfig("jwt_iss", false, "ourvoiceusa.org"),
  google_maps_key: getConfig("google_maps_key", false, null),
  sm_oauth_url: getConfig("sm_oauth_url", false, 'https://ws.ourvoiceusa.org/auth'),
  no_auth: getConfig("react_app_no_auth", false, false),
  volunteer_add_new: getConfig("volunteer_add_new", false, null),
  purge_import_records: getConfig("purge_import_records", false, null),
  wabase: getConfig("wabase", false, 'https://apps.ourvoiceusa.org'),
  DEBUG: getConfig("debug", false, false),
};
