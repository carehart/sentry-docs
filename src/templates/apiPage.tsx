import React, { useState, useEffect, Fragment } from "react";
import { graphql } from "gatsby";
import Prism from "prismjs";

import ApiSidebar from "~src/components/apiSidebar";
import BasePage from "~src/components/basePage";
import Content from "~src/components/content";
import SmartLink from "~src/components/smartLink";

import {
  OpenAPI,
  OpenApiPath,
} from "~src/gatsby/plugins/gatsby-plugin-openapi/types";

import "prismjs/components/prism-json";

const Params = ({ params }) => (
  <dl className="api-params">
    {params.map(param => (
      <React.Fragment key={param.name}>
        <dt>
          <div>
            <code data-index>{param.name}</code>
            {!!param.schema?.type && <em> ({param.schema.type})</em>}
          </div>
          {!!param.required && <div className="required">REQUIRED</div>}
        </dt>

        {!!param.description && (
          <dd>
            {param.schema?.enum && (
              <Fragment>
                <b>choices</b>:
                <ul>
                  <code>
                    {param.schema?.enum.map(e => {
                      return <li key={e}>{e}</li>;
                    })}
                  </code>
                </ul>
              </Fragment>
            )}
            <Content file={param} />
          </dd>
        )}
      </React.Fragment>
    ))}
  </dl>
);

const Example = props => {
  const selectedTabView: number = props.selectedTabView;
  const data: OpenApiPath = props.data;
  const selectedResponse: number = props.selectedResponse;

  let exampleJson;
  if (data.responses[selectedResponse].content?.examples) {
    exampleJson = JSON.stringify(
      Object.values(
        JSON.parse(data.responses[selectedResponse].content?.examples)
      )[0]["value"],
      null,
      2
    );
  } else if (data.responses[selectedResponse].content?.example) {
    exampleJson = data.responses[selectedResponse].content?.example;
  }
  return (
    <pre className="api-block-example response">
      {selectedTabView === 0 &&
        (exampleJson ? (
          <code
            dangerouslySetInnerHTML={{
              __html: Prism.highlight(
                exampleJson,
                Prism.languages.json,
                "json"
              ),
            }}
          />
        ) : (
          strFormat(data.responses[selectedResponse].description)
        ))}
      {selectedTabView === 1 && (
        <code
          dangerouslySetInnerHTML={{
            __html: Prism.highlight(
              data.responses[selectedResponse].content.schema,
              Prism.languages.json,
              "json"
            ),
          }}
        />
      )}
    </pre>
  );
};

const getScopes = (data, securityScheme) => {
  const obj = data.security.find(e => e[securityScheme]);
  return obj[securityScheme];
};

const strFormat = str => {
  const s = str.trim();
  if (s.endsWith(".")) {
    return s;
  }
  return s + ".";
};

export default props => {
  const openApi: OpenAPI = props.data?.openApi || ({} as any);
  const data = openApi?.path;
  const requestBodyContent = data.requestBody?.content;
  const bodyParameters = openApi.childrenOpenApiBodyParameter || [];
  const pathParameters = (openApi.childrenOpenApiPathParameter || []).filter(
    param => param.in === "path"
  );
  const queryParameters = (openApi.childrenOpenApiPathParameter || []).filter(
    param => param.in === "query"
  );
  const contentType = requestBodyContent?.content_type;

  const apiExample = [
    `curl https://sentry.io${data.apiPath}`,
    ` -H 'Authorization: Bearer <auth_token>'`,
  ];

  if (["put", "options", "delete"].includes(data.method.toLowerCase())) {
    apiExample.push(` -X ${data.method.toUpperCase()}`);
  }

  if (contentType) {
    apiExample.push(` -H 'Content-Type: ${contentType}'`);
  }

  if (bodyParameters.length) {
    const requestBodyExample =
      (requestBodyContent?.example && JSON.parse(requestBodyContent.example)) ||
      {};

    if (contentType === "multipart/form-data") {
      Object.entries(requestBodyExample).map(
        ([key, value]) =>
          value !== undefined && apiExample.push(` -F ${key}=${value}`)
      );
    } else {
      apiExample.push(` -d '${JSON.stringify(requestBodyExample)}'`);
    }
  }

  const [selectedResponse, selectResponse] = useState(0);

  const [selectedTabView, selectTabView] = useState(0);
  const tabViews = data.responses[selectedResponse].content?.schema
    ? ["RESPONSE", "SCHEMA"]
    : ["RESPONSE"];

  useEffect(() => {
    Prism.highlightAll();
  }, []);
  return (
    <BasePage sidebar={<ApiSidebar />} {...props}>
      <div className="row">
        <div className="col-6">
          {data.summary && <p>{data.summary}</p>}

          {data.description && (
            <div className="pb-3 content-flush-bottom">
              <Content file={openApi.childOpenApiPathDescription} />
            </div>
          )}

          {!!pathParameters.length && (
            <div className="api-info-row">
              <h3>Path Parameters</h3>
              <Params params={pathParameters} />
            </div>
          )}

          {!!queryParameters.length && (
            <div className="api-info-row">
              <h3>Query Parameters:</h3>
              <Params params={queryParameters} />
            </div>
          )}

          {!!bodyParameters.length && (
            <div className="api-info-row">
              <h3>Body Parameters</h3>
              <Params params={bodyParameters} />
            </div>
          )}

          {data.security.length && (
            <div className="api-info-row">
              <h3>Scopes</h3>

              <div>
                <div>
                  {"You need to "}
                  <SmartLink to={"/api/auth"}>
                    authenticate via bearer auth token.
                  </SmartLink>
                </div>
                <code>{"<auth_token>"}</code> requires the following scopes:
              </div>

              <ul>
                {getScopes(data, "auth_token").map(scope => (
                  <li key={scope} style={{ fontWeight: "bold" }}>
                    <code>{scope}</code>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="col-6">
          <div className="api-block">
            <div className="api-block-header request">
              <span className="api-request-block-verb">
                {data.method.toUpperCase()}
              </span>{" "}
              <span>{data.apiPath}</span>
            </div>
            <pre className="api-block-example request">
              {apiExample.join(" \\\n")}
            </pre>
          </div>
          <div className="api-block">
            <div className="api-block-header response">
              <div className="tabs-group">
                {tabViews.map((view, i) => (
                  <span
                    key={view}
                    className={`tab ${selectedTabView === i && "selected"}`}
                    onClick={() => selectTabView(i)}
                  >
                    {view}
                  </span>
                ))}
              </div>
              <div className="response-status-btn-group">
                {data.responses.map(
                  (res, i) =>
                    res.status_code && (
                      <button
                        className={`response-status-btn ${selectedResponse ===
                          i && "selected"}`}
                        key={res.status_code}
                        onClick={() => {
                          selectResponse(i);
                          selectTabView(0);
                        }}
                      >
                        {res.status_code}
                      </button>
                    )
                )}
              </div>
            </div>
            <Example
              data={data}
              selectedTabView={selectedTabView}
              selectedResponse={selectedResponse}
            ></Example>
          </div>
        </div>
      </div>
    </BasePage>
  );
};

export const pageQuery = graphql`
  query OpenApiQuery($id: String) {
    openApi(id: { eq: $id }) {
      id
      childOpenApiPathDescription {
        childMdx {
          body
        }
      }
      childrenOpenApiPathParameter {
        id
        childMdx {
          body
        }
        schema {
          enum
          format
          type
        }
        name
        in
        description
        required
      }
      childrenOpenApiBodyParameter {
        id
        childMdx {
          body
        }
        schema {
          enum
          format
          type
        }
        name
        in
        description
        required
      }
      path {
        description
        method
        operationId
        summary
        tags
        apiPath
        readableUrl
        parameters {
          schema {
            type
            format
            enum
          }
          name
          in
          description
          required
        }
        responses {
          content {
            content_type
            example
            examples
            schema
          }
          description
          status_code
        }
        requestBody {
          content {
            content_type
            example
            schema
          }
          required
        }
        summary
        tags
        security {
          auth_token
        }
      }
    }
  }
`;
