import React from "react";
import { gql, useQuery, useMutation } from "@apollo/client";
import { cloneDeep } from "lodash";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import BootstrapForm from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import Alert from "react-bootstrap/Alert";
import Autocomplete from "./Autocomplete";

const FIELD_COMPONENT_MAP = {
  email: { component: BootstrapForm.Control },
  text: { component: BootstrapForm.Control },
  check: { component: BootstrapForm.Check },
  select: { component: BootstrapForm.Control, props: { as: "select" } },
  text_area: {
    component: BootstrapForm.Control,
    props: { as: "textarea", rows: "3" },
  },
  autocomplete: { component: Autocomplete },
};

function getInputComponent(field, editing, currentValues, setCurrentValues) {
  const is_read_only = editing && !field.read_only ? false : true;
  // todo: aint pretty, but we we can't set autocomplete as readonly, we have to use a text input instead
  // see: https://github.com/ericgio/react-bootstrap-typeahead/issues/324
  const input_type =
    field.input_type === "autocomplete" && is_read_only
      ? "text"
      : field.input_type;

  const componentDef = FIELD_COMPONENT_MAP[input_type];

  const FormInputComponent = componentDef.component;

  if (input_type === "autocomplete") {
    return (
      <Autocomplete
        field={field}
        onChange={(e) => handleChange(e, currentValues, setCurrentValues)}
      />
    );
  } else if (field.options) {
    return (
      <FormInputComponent
        plaintext={is_read_only}
        readOnly={is_read_only}
        size="sm"
        key={field.name}
        id={field.name}
        type={field.type}
        placeholder={field.placeholder}
        onChange={(e) => handleChange(e, currentValues, setCurrentValues)}
        {...componentDef.props}
      >
        {field.options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </FormInputComponent>
    );
  } else {
    return (
      <FormInputComponent
        plaintext={is_read_only}
        readOnly={is_read_only}
        size="sm"
        key={field.name}
        id={field.name}
        type={field.type}
        placeholder={field.placeholder}
        onChange={(e) => handleChange(e, currentValues, setCurrentValues)}
        value={
          currentValues && currentValues[field.name]
            ? currentValues[field.name]
            : ""
        }
        {...componentDef.props}
      />
    );
  }
}

function getField(field, editing, currentValues, setCurrentValues) {
  return (
    <React.Fragment key={field.name}>
      <BootstrapForm.Label column sm={2} size="sm">
        <b>{field.label}</b>
      </BootstrapForm.Label>
      <Col>
        {getInputComponent(field, editing, currentValues, setCurrentValues)}
        {editing && (
          <BootstrapForm.Text className="text-muted">
            {field.helper_text}
          </BootstrapForm.Text>
        )}
      </Col>
    </React.Fragment>
  );
}

function getErrorMessage(error) {
  // see: https://www.apollographql.com/docs/react/data/error-handling/
  return error.graphQLErrors.map((message) => message.message);
}

function filterByKeys(object, keys) {
  return Object.keys(object)
    .filter((key) => keys.includes(key))
    .reduce((obj, key) => {
      obj[key] = object[key];
      return obj;
    }, {});
}

function handleSubmitComplete(setNeedsRefetch, setEditing) {
  setNeedsRefetch(true);
  setEditing(false);
}

function handleSubmit(
  e,
  currentValues,
  fields,
  submitForm,
  idParam,
  setNeedsRefetch,
  setEditing
) {
  e.preventDefault();
  let idVal = currentValues[idParam];
  // reduce current values to only those fields which have been defined in the form
  const fieldKeys = fields.map((field) => field.name);
  const submitValues = filterByKeys(currentValues, fieldKeys);
  submitForm({
    variables: { object: submitValues, [idParam]: idVal },
    onCompleted: handleSubmitComplete(setNeedsRefetch, setEditing),
  });
}

function handleChange(e, currentValues, setCurrentValues) {
  let currentValuesClone = cloneDeep(currentValues);
  currentValuesClone[e.target.id] = e.target.value;
  setCurrentValues(currentValuesClone);
}

function groupFieldsIntoColumns(fields, num_columns) {
  num_columns = num_columns < 1 ? 1 : num_columns;
  let columns = [];
  for (let i = 0; i < fields.length; i += num_columns) {
    columns.push(fields.slice(i, i + num_columns));
  }
  return columns;
}

function SubmitConfirmation(props) {
  return (
    <Alert variant="success">
      <Col>Form submitted!</Col>
    </Alert>
  );
}

function GetFormData(props) {
  // TODO: handle errors/loading from this form data query
  const param = props.param;
  const match = props.match;

  const variables = param && match ? { [param]: match } : {};
  const query = gql`
    ${props.query}
  `;

  const { data, refetch } = useQuery(query, {
    variables: variables,
  });

  if (typeof data === "object") {
    const accessor = Object.keys(data)[0];
    return [data[accessor][0], refetch];
  }

  return [data, refetch];
}

export default function Form(props) {
  const [editing, setEditing] = React.useState(false);
  const [showSubmitConfirmation, setShowSubmitConfirmation] = React.useState(false);
  const [submitForm, { data }] = useMutation(
    gql`
      ${props.mutation.gql}
    `
  );
  console.log("MUTATIONDATATA", data);
  // initialize the form values state, one key per field, all undefined
  let fields = [...props.fields];

  let initialValues = {};

  fields.map((field) => {
    initialValues[field.name] = undefined;
    return null;
  });

  const [needsRefetch, setNeedsRefetch] = React.useState(false);

  // this state will be updated on any input change
  const [currentValues, setCurrentValues] = React.useState(initialValues);

  // formData is immutable once fetched from gql
  let [formData, refetch] = GetFormData(props);

  React.useEffect(() => {
    setCurrentValues(cloneDeep(formData));
  }, [formData]);

  React.useEffect(() => {
    setCurrentValues(cloneDeep(formData));
  }, [editing]);

  React.useEffect(() => {
    if (needsRefetch) {
      refetch();
    }
  }, [needsRefetch]);

  const columns = groupFieldsIntoColumns(fields, props.num_columns);

  return (
    <>
      <BootstrapForm
        onSubmit={(e) =>
          handleSubmit(
            e,
            currentValues,
            fields,
            submitForm,
            props.mutation.idParam,
            setNeedsRefetch,
            setEditing
          )
        }
      >
        {columns.map((fields, i) => {
          return (
            <Row key={`form-row-${i}`}>
              {fields.map((field) => {
                return getField(
                  field,
                  editing,
                  currentValues,
                  setCurrentValues
                );
              })}
            </Row>
          );
        })}
        {editing && (
          <>
            <Button
              variant="primary"
              type="submit"
            >
              Save
            </Button>
            <Button
              variant="warning"
              type="cancel"
              onClick={(e) => {
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </>
        )}
        {!editing && (
          <Button
            variant="secondary"
            onClick={(e) => {
              setEditing(true);
            }}
            type="edit"
          >
            Edit
          </Button>
        )}
      </BootstrapForm>
    </>
  );
}
