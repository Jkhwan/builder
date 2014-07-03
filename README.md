
# retsly/builder

Component builder middleware.

## Guide

The **build** module is an Express middleware responsible for assembling
the client-side web app, powered by [component][1]. The entry point for
the builder is [component.json][2] found in the project root.

### Plugins

The builder uses version **1.0.0-rc5** of component, and two plugins:
[builder-stylus][3] and [builder-jade][4].

### Development mode

When idx is launched with `NODE_ENV=development`, the builder will
rebuild the app on every request. Otherwise, it builds the app once.
Also while in development mode, the builder will add `#sourceURL`
comments and file/line comments to the JS and CSS to aid in debugging.

To take advantage of `#sourceURL`, make sure you check **Enable
JavaScript source maps** in Chrome Devtools.

### Debug output

Launch the app with `DEBUG=idx:build` to show debug output.

## API

### build(opts)

Returns an Express middleware.

#### options

- `destination` path where files will be written.


[1]:https://github.com/component/component
[2]:https://github.com/Retsly/idx/blob/master/component.json
[3]:../builder-stylus/
[4]:https://github.com/segmentio/component-jade
