import { useEffect, useState, useRef } from 'react';
import '@kitware/vtk.js/favicon';
// Load the rendering pieces we want to use (for both WebGL and WebGPU)
import '@kitware/vtk.js/Rendering/Profiles/All';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkInteractorStyleImage from '@kitware/vtk.js/Interaction/Style/InteractorStyleImage';
import vtkSplineWidget from '@kitware/vtk.js/Widgets/Widgets3D/SplineWidget';
import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';
import { splineKind } from '@kitware/vtk.js/Common/DataModel/Spline3D/Constants';
import {Row, Col, Select, Checkbox, Slider, Button} from 'antd';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';
const { Option } = Select;
import 'antd/dist/antd.less';

export default function SplineWidget() {
    const [kind, setKind] = useState(0);
    const [tension, setTension] = useState(0);
    const [bias, setBias] = useState(0);
    const [continuity, setContinuity] = useState(0);
    const [resolution, setResolution] = useState(20);
    const [handleSize, setHandleSize] = useState(20);
    const [allowFreehand, setAllowFreehand] = useState(true);
    const [freehandDistance, setFreehandDistance] = useState(0.2);
    const [close, setClose] = useState(true);
    const [boundaryCondition, setBoundaryCondition] = useState(0);
    const [boundaryConditionValueX, setBoundaryConditionValueX] = useState(0);
    const [boundaryConditionValueY, setBoundaryConditionValueY] = useState(0);
    const [border, setBorder] = useState(true);
    const [boundaryConditionValueXDisabled, setBoundaryConditionValueXDisabled] = useState(true);
    const [boundaryConditionValueYDisabled, setBoundaryConditionValueYDisabled] = useState(true);
    const [boundaryConditionDisabled, setBoundaryConditionDisabled] = useState(true);
    const [tensionInputDisabled, setTensionInputDisabled] = useState(false);
    const [biasInputDisabled, setBiasInputDisabled] = useState(false);
    const [continuityInputDisabled, setContinuityInputDisabled] = useState(false);

    let renderer = useRef({});
    let widget = useRef({});
    let renderWindow = useRef({});
    let widgetRepresentation = useRef({});
    let widgetManager = useRef({});

    useEffect(() => {
        // Standard rendering code setup
        const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
            background: [0, 0, 0],
        });
        renderer.current = fullScreenRenderer.getRenderer();
        renderWindow.current = fullScreenRenderer.getRenderWindow();
        const iStyle = vtkInteractorStyleImage.newInstance();
        renderWindow.current.getInteractor().setInteractorStyle(iStyle);

        // Widget manager
        widgetManager.current = vtkWidgetManager.newInstance();
        widgetManager.current.setRenderer(renderer.current);
        widget.current = vtkSplineWidget.newInstance();
        widgetRepresentation.current = widgetManager.current.addWidget(widget.current);
        renderer.current.resetCamera();
    }, []);
    // UI
    const kindHandle = (value: number) => {
        setKind(value);
        const isKochanek = value === 0;
        setTensionInputDisabled(!isKochanek);
        setBiasInputDisabled(!isKochanek);
        setContinuityInputDisabled(!isKochanek);
        const kind = isKochanek ? splineKind.KOCHANEK_SPLINE : splineKind.CARDINAL_SPLINE;
        widget.current.getWidgetState().setSplineKind(kind);
        renderWindow.current.render();
    };
    const tensionHandle = (value: number) => {
        setTension(value);
        widget.current.getWidgetState().setSplineTension(value);
        renderWindow.current.render();
    };
    const biasHandle = (value: number) => {
        setBias(value);
        widget.current.getWidgetState().setSplineBias(value);
        renderWindow.current.render();
    };
    const continuityHandle = (value: number) => {
        setContinuity(value);
        widget.current.getWidgetState().setSplineContinuity(value);
        renderWindow.current.render();
    };
    const resolutionHandle = (value: number) => {
        setResolution(value);
        // todo string ? number
        widgetRepresentation.current.setResolution(value);
        renderWindow.current.render();
    };
    const handleSizeHandle = (value: number) => {
        setHandleSize(value);
        // todo string ? number
        widgetRepresentation.current.setHandleSizeInPixels(value);
        renderWindow.current.render();
    };
    const allowFreehandHandle = (e: CheckboxChangeEvent) => {
        setAllowFreehand(e.target.checked);
        widgetRepresentation.current.setAllowFreehand(e.target.checked);
    };
    const freehandDistanceHandle = (value: number) => {
        setFreehandDistance(value);
        // todo string ? number
        widgetRepresentation.current.setFreehandMinDistance(value);
    };
    const closeHandle = (e: CheckboxChangeEvent) => {
        setClose(e.target.checked);

        setBoundaryConditionDisabled(e.target.checked);
        boundaryConditionValueXDisabled(e.target.checked || boundaryCondition === 0);
        boundaryConditionValueYDisabled(e.target.checked || boundaryCondition === 0);
        widget.current.getWidgetState().setSplineClosed(e.target.checked);
        renderWindow.current.render();
    };
    const boundaryConditionHandle = (value: number) => {
        setBoundaryCondition(value);

        const isDefault = value === 0;
        const boundaryConditionValueXDisabled = widget.current.getWidgetState().getSplineClosed() || isDefault
        setBoundaryConditionValueXDisabled(boundaryConditionValueXDisabled);
        const boundaryConditionValueYDisabled = widget.current.getWidgetState().getSplineClosed() || isDefault;
        setBoundaryConditionValueYDisabled(boundaryConditionValueYDisabled);
        widget.current.getWidgetState().setSplineBoundaryCondition(Number(value));
        renderWindow.current.render();
    };
    const boundaryConditionValueXHandle = (value: number) => {
        setBoundaryConditionValueX(value);

        const valX = value;
        const valY = boundaryConditionValueY;
        widget.current.getWidgetState().setSplineBoundaryConditionValues([valX, valY, 0]);
        renderWindow.current.render();
    };
    const boundaryConditionValueYHandle = (value: number) => {
        setBoundaryConditionValueY(value);

        const valX = boundaryConditionValueX;
        const valY = value;
        widget.current.getWidgetState().setSplineBoundaryConditionValues([valX, valY, 0]);
        renderWindow.current.render();
    };
    const borderHandle = (e: CheckboxChangeEvent) => {
        setBorder(e.target.checked);

        widgetRepresentation.current.setOutputBorder(e.target.checked);
        renderWindow.current.render();
    };
    const placeWidgetHandle = () => {
        widgetRepresentation.current.reset();
        widgetManager.current.grabFocus(widget.current);
    };
    return (
        <div>
            <div style={{
                position: 'absolute',
                top: '25px',
                left: '25px',
                background: 'white',
                padding: '12px',
                zIndex: 1,
                width: '400px'
            }}>
                <Row>
                    <Col span={12}>Kind</Col>
                    <Col span={12}>
                        <Select value={kind} onChange={kindHandle}>
                            <Option value={0}>Kochanek</Option>
                            <Option value={1}>Cardinal</Option>
                        </Select>
                    </Col>
                </Row>
                <Row>
                    <Col span={12}>Tension</Col>
                    <Col span={12}>
                        <Slider value={tension} step={0.1} min={-1} max={1} onChange={tensionHandle} disabled={tensionInputDisabled}/>
                    </Col>
                </Row>
                <Row>
                    <Col span={12}>Bias</Col>
                    <Col span={12}>
                        <Slider value={bias} step={0.1} min={-1} max={1} onChange={biasHandle} disabled={biasInputDisabled}/>
                    </Col>
                </Row>
                <Row>
                    <Col span={12}>Continuity</Col>
                    <Col span={12}>
                        <Slider value={continuity} step={0.1} min={-1} max={1} onChange={continuityHandle} disabled={continuityInputDisabled}/>
                    </Col>
                </Row>
                <Row>
                    <Col span={12}>Resolution</Col>
                    <Col span={12}>
                        <Slider value={resolution} step={1} min={1} max={32} onChange={resolutionHandle}/>
                    </Col>
                </Row>
                <Row>
                    <Col span={12}>Handles size</Col>
                    <Col span={12}>
                        <Slider value={handleSize} step={1} min={10} max={50} onChange={handleSizeHandle}/>
                    </Col>
                </Row>
                <Row>
                    <Col span={12}>Drag (freehand)</Col>
                    <Col span={3}>
                        <Checkbox checked={allowFreehand} onChange={allowFreehandHandle}></Checkbox>
                    </Col>
                    <Col span={9}>
                        <Slider value={freehandDistance} step={0.05} min={0.05} max={1} onChange={freehandDistanceHandle}/>
                    </Col>
                </Row>
                <Row>
                    <Col span={12}>Closed spline</Col>
                    <Col span={12}>
                        <Checkbox checked={close} onChange={closeHandle}></Checkbox>
                    </Col>
                </Row>
                <Row>
                    <Col span={12}>Boundary conditions</Col>
                    <Col span={12}>
                        <Select value={boundaryCondition} onChange={boundaryConditionHandle} disabled={boundaryConditionDisabled}>
                            <Option value={0}>default</Option>
                            <Option value={1}>derivative</Option>
                            <Option value={2}>2nd derivative</Option>
                            <Option value={3}>2nd derivative interior point</Option>
                        </Select>
                    </Col>
                </Row>
                <Row>
                    <Col span={12}>Boundary Condition value X</Col>
                    <Col span={12}>
                        <Slider value={boundaryConditionValueX} step={0.1} min={-2} max={2} onChange={boundaryConditionValueXHandle} disabled={boundaryConditionValueXDisabled}/>
                    </Col>
                </Row>
                <Row>
                    <Col span={12}>Boundary Condition value Y</Col>
                    <Col span={12}>
                        <Slider value={boundaryConditionValueY} step={0.1} min={-2} max={2} onChange={boundaryConditionValueYHandle} disabled={boundaryConditionValueYDisabled}/>
                    </Col>
                </Row>
                <Row>
                    <Col span={12}>Border</Col>
                    <Col span={12}>
                        <Checkbox checked={border} onChange={borderHandle}></Checkbox>
                    </Col>
                </Row>
                <Row>
                    <Col span={12}>
                        <Button type="primary" onClick={placeWidgetHandle}>Place Widget</Button>
                    </Col>
                </Row>
            </div>
        </div>
    );
}