import React from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";

export default function Menu(props) {
  return (
    <Row>
      <Col id={props.id}>
        {props.buttons.map((button) => {
          const icon = button.icon ? button.icon : "";
          return (
            <Button key={button.label} className="mr-2" {...button.props}>
              {icon} {button.label}
            </Button>
          );
        })}
      </Col>
    </Row>
  );
}
