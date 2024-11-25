export function getSubPath(path, separator) {
  const splitIndex = path.indexOf(separator) + separator.length;
  return path.substring(splitIndex) || '/';
}
