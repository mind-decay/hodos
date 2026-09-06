role: design
server: figma
getFrame:   mcp__figma__get_design_context {fileKey, nodeId, excludeScreenshot: true}
variables:  mcp__figma__get_variable_defs {fileKey, nodeId}
screenshot: mcp__figma__get_screenshot {fileKey, nodeId, maxDimension}
gotchas:
- one pull, on plan: spacing, colors and variants are materialized into the plan's design section, and execute reads the plan. A dozen states pulled per component is hundreds of thousands of tokens
- get_design_context returns a screenshot beside the code unless excludeScreenshot is set
- get_screenshot answers with a short-lived URL and a curl line; the inline base64 form is opt-in and costs the whole image
- verify pulls again for fresh numbers; execute does not pull at all
