
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

#### Example

    // hit /app/app.js to get the compiled app
    app
      .use('/app', builder({out:'build', path:'app'}))
      .use('/app', static('build'))

#### Options

    out     ('./build') output directory
    root    ('.')     path to component.json
    path    ('app')   filename for compiled css and js

The options object is also passed directly to the builder and plugins:

- [component-builder2](https://github.com/component/builder2.js)
- [builder-stylus](https://github.com/retsly/builder-stylus)
- [builder-jade](https://github.com/component/builder-jade)

### Builder(opts)

Builder constructor. Use this to build your app in non-middleware
contexts (ie. build scripts). Same options as above.

## License

(The MIT License)

Copyright (c) 2014 Retsly Software, Inc. <support@rets.ly>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

[1]:https://github.com/component/component
[2]:https://github.com/Retsly/idx/blob/master/component.json
[3]:https://github.com/Retsly/builder-stylus
[4]:https://github.com/component/builder-jade
