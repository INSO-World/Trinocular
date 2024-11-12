

// This helper function takes a frameUrl and adds the uuid of the current repo to it as 
// a query parameter. The uuid is taken from the repoUuid on the global context.
export function addRepoUuidSearchParam( frameUrl, options ) {
  try {
    const url= new URL( frameUrl );
    const rootContext= options.data.root;
    url.searchParams.set('repo', rootContext.repoUuid);
    return url.href;

  } catch( e ) {
    console.log('Could not add repo uuid to frame url:', e);
    return '';
  }
}

// Select the first truthy value from all the provided variables
export function chooseTruthy( ...args ) {

  // Ignore the last argument which contains the handlebars options object
  for( let i= 0; i < args.length-1; i++ ) {
    if( args[i] ) {
      return args[i];
    }
  }

  return '';
}

// Evaluate two arguments with an operator as an expression
// eg. (exp myVar '===' 'my string')
export function exp(arg1, operator, arg2, options) {
  switch( operator )  {
    case '===': return arg1 === arg2;
    case '!==': return arg1 !== arg2;
    case '<':   return arg1 < arg2;
    case '>':   return arg1 > arg2;
    case '<=':  return arg1 <= arg2;
    case '>=':  return arg1 >= arg2;
    case '&&':  return arg1 && arg2;
    case '||':  return arg1 || arg2;
    case '+':   return arg1 + arg2;
    case '-':   return arg1 + arg2;
    case '*':   return arg1 * arg2;
    case '/':   return arg1 / arg2;
    case '%':   return arg1 % arg2;
    default:
      throw new Error(`Invalid handlbars expression operator '${operator}' (args ${args1} ${args2})`);
  }
}

export function isObject(arg1, options) {
  return typeof arg1 === 'object';
}
