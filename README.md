# cogs-transformer-directives

A directives transformer for [Cogs].

[![Build Status]](http://travis-ci.org/caseywebdev/cogs-transformer-directives)

Extract `require` and `link` directives from a file's initial comments.

In the following example, the file itself will be proceeded by every file in the
templates directory.

```js
//= requireself
//= require ./templates/**/*

var foo = 'bar';
```

In this example, the file will be prepended with `normalize.css`.

```css
/*
= require bower_components/normalize/normalize.css
*/

.foo {
  color: blue;
}
```

[Cogs]: https://github.com/caseywebdev/cogs
[Build Status]: https://secure.travis-ci.org/caseywebdev/cogs-transformer-directives.png
