
import { readFileSync } from 'node:fs';

const regex= /\{\{\s*([0-9a-zA-Z_]+)\s*\}\}/g;

/**
 * @param {string} string 
 * @param {Object.<string,string>|string[]|Map<string,string>} variables 
 * @returns 
 */
export function templateString( string, variables= {} ) {

  let getter;
  if( Array.isArray(variables) ) {
    getter= name => variables[ parseInt(name) ];
  } else if( variables instanceof Map ) {
    getter= name => variables.get( name );
  } else {
    getter= name => variables.hasOwnProperty(name) ? variables[name] : null;
  }

  return string.replaceAll( regex, (match, name, index) => {
    // Escape triple curly braced
    if( string[index - 1] === "{" && string[index + match.length] === "}" ) {
      return match;
    }

    const value= getter( name );

    return value === null || value === undefined ? '' : value;
  });
}

export function templateFile( filePath, variables ) {
  const templateFile= readFileSync( filePath, 'utf-8' );
  return templateString( templateFile, variables );
}
