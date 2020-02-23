if(angular) angular.expand = function(dest) { return { with: function(src) {
    if((!src )|| (!dest)) return;
    if(typeof src !== 'object') return;
    for(var prop in src) {
        if(!src.hasOwnProperty(prop)) continue;
        if(!dest.hasOwnProperty(prop)) {
            dest[prop] = src[prop];
            continue;
        }
        if((typeof dest[prop]) !==
           (typeof src[prop])) {
            if(angular.isArray(dest[prop]))
                dest[prop].push(src[prop])
            continue;
        } else {
            if((typeof src[prop] === 'string') &&
               (dest[prop] !== src[prop]))
                dest[prop] += src[prop];
            else if(angular.isArray(src[prop]))
                dest[prop] = dest[prop].concat(src[prop]);
            else if((typeof src[prop] === 'number') ||
                    (typeof src[prop] === 'boolean') ||
                    (typeof src[prop] === 'function'))
                dest[prop] = [dest[prop]].push(src[prop]);
            else angular.expand(dest[prop]).with(src[prop]);
        }
    }
} }; };