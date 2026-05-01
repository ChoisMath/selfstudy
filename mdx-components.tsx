import type { MDXComponents } from "mdx/types";

const components: MDXComponents = {
  h1: (props) => (
    <h1
      className="mt-0 text-3xl font-bold tracking-normal text-gray-950 sm:text-4xl"
      {...props}
    />
  ),
  h2: (props) => (
    <h2
      className="mt-12 border-t border-gray-200 pt-8 text-2xl font-bold tracking-normal text-gray-950"
      {...props}
    />
  ),
  h3: (props) => (
    <h3 className="mt-8 text-lg font-semibold tracking-normal text-gray-900" {...props} />
  ),
  p: (props) => <p className="mt-4 leading-7 text-gray-700" {...props} />,
  ul: (props) => <ul className="mt-4 list-disc space-y-2 pl-5 text-gray-700" {...props} />,
  ol: (props) => <ol className="mt-4 list-decimal space-y-2 pl-5 text-gray-700" {...props} />,
  li: (props) => <li className="leading-7" {...props} />,
  strong: (props) => <strong className="font-semibold text-gray-950" {...props} />,
  a: (props) => (
    <a
      className="font-medium text-blue-700 underline decoration-blue-200 underline-offset-4 hover:text-blue-900"
      {...props}
    />
  ),
  table: (props) => (
    <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm" {...props} />
    </div>
  ),
  th: (props) => (
    <th className="bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700" {...props} />
  ),
  td: (props) => <td className="px-3 py-2 text-gray-700" {...props} />,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
