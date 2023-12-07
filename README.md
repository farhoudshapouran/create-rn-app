# Create RN App

The easiest way to get started with React Native is by using `create-rn-app`. This CLI tool enables you to quickly start building a new React Native application, with everything set up for you.

### Interactive

You can create a new project interactively by running:

```bash
npx create-rn-app
# or
yarn create rn-app
# or
pnpm create rn-app
# or
bunx create-rn-app
```

You will be asked for the name of your project, and then whether you want to
create a TypeScript project:

```bash
✔ Would you like to use TypeScript? … No / Yes
```

Select **Yes** to install the necessary types/dependencies and create a new TS project.

### Non-interactive

You can also pass command line arguments to set up a new project
non-interactively. See `create-rn-app --help`:

```bash
create-rn-app <project-directory> [options]

Options:
  -V, --version                      output the version number
  --ts, --typescript

    Initialize as a TypeScript project. (default)

  --js, --javascript

    Initialize as a JavaScript project.

  --use-npm

    Explicitly tell the CLI to bootstrap the app using npm

  --use-yarn

    Explicitly tell the CLI to bootstrap the app using Yarn

  --use-bun

    Explicitly tell the CLI to bootstrap the app using Bun

  -e, --example [name]|[github-url]

    An example to bootstrap the app with. You can use an example name
    from the Create-RN-App repo or a GitHub URL. The URL can use
    any branch and/or subdirectory

  --example-path <path-to-example>

    In a rare case, your GitHub URL might contain a branch name with
    a slash (e.g. bug/fix-1) and the path to the example (e.g. foo/bar).
    In this case, you must specify the path to the example separately:
    --example-path foo/bar
```