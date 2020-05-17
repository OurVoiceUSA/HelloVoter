
// transform a geojson file into an array of polygons

var asyncForEach = async function (a, c) {
  for (let i = 0; i < a.length; i++) await c(a[i], i, a);
}

var deepCopy = function (o) {
  return JSON.parse(JSON.stringify(o));
}

var getConfig = function (item, required, def) {
  let value = secrets_get(item);
  if (!value) {
    if (required) {
      let msg = "Missing config: "+item.toUpperCase();
      console.log(msg);
      throw msg;
    } else {
      return def;
    }
  }
  return value;
}

var ucFirst = function (str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

exports.asyncForEach = asyncForEach;
exports.deepCopy = deepCopy;
exports.getConfig = getConfig;
exports.ucFirst = ucFirst;
