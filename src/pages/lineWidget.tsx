import {useEffect, useState, useRef} from 'react';

import '@kitware/vtk.js/favicon';

// Load the rendering pieces we want to use (for both WebGL and WebGPU)
import '@kitware/vtk.js/Rendering/Profiles/Geometry';
import '@kitware/vtk.js/Rendering/Profiles/Glyph';

import DeepEqual from 'deep-equal';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkCubeSource from '@kitware/vtk.js/Filters/Sources/CubeSource';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkLineWidget from '@kitware/vtk.js/Widgets/Widgets3D/LineWidget';
import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';

import {Select, Slider, Button, Checkbox, Input} from 'antd';
const { TextArea } = Input;
const {Option} = Select;

export default function LineWidget() {
    const [idh1, setIdh1] = useState('sphere');
    const [idh2, setIdh2] = useState('sphere');
    const [visiH1, setVisiH1] = useState(true);
    const [visiH2, setVisiH2] = useState(true);
    const [txtIpt, setTxtIpt] = useState('');
    const [distance, setDistance] = useState(0);
    // Standard rendering code setup
    let widget = useRef(null);
    let lineWidget = useRef({});
    let getHandle = useRef({});
    let renderWindow = useRef({});
    let widgetManager = useRef({});
    let selectedWidgetIndex = 0;

    useEffect(() => {
        const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
            background: [0, 0, 0],
        });
        const renderer = fullScreenRenderer.getRenderer();
        renderWindow = fullScreenRenderer.getRenderWindow();
        
        const cube = vtkCubeSource.newInstance();
        const mapper = vtkMapper.newInstance();
        const actor = vtkActor.newInstance();
        
        actor.setMapper(mapper);
        mapper.setInputConnection(cube.getOutputPort());
        actor.getProperty().setOpacity(0.5);
        
        renderer.addActor(actor);
        // Widget manager
        widgetManager = vtkWidgetManager.newInstance();
        widgetManager.setRenderer(renderer);
        
        renderer.resetCamera();
    }, []);
    //methods
    const visiH1Handle = (e) => {
        if (lineWidget == null) {
            return;
        }
        lineWidget.getWidgetState().getHandle1().setVisible(e.target.checked);
        lineWidget.updateHandleVisibility(0);
        lineWidget.getInteractor().render();
        renderWindow.render();
    };
    const visiH2Handle = (e) => {
        console.log(e.target.checked);
        lineWidget.getWidgetState().getHandle2().setVisible(e.target.checked);
        lineWidget.updateHandleVisibility(1);
        lineWidget.getInteractor().render();
        renderWindow.render();
    };
    const txtIptHandle = (e) => {
        setTxtIpt(e.target.value);
        lineWidget.setText(e.target.value);
        renderWindow.render();
    };
    const setWidgetColor = (currentWidget, color) => {
        currentWidget.getWidgetState().getHandle1().setColor(color);
        currentWidget.getWidgetState().getHandle2().setColor(color);
        currentWidget.getWidgetState().getMoveHandle().setColor(color);
    };
    const observeDistance = () => {
        lineWidget.onInteractionEvent(() => {
            const distance = widget.getDistance().toFixed(2);
            setDistance(distance);
        });

        lineWidget.onEndInteractionEvent(() => {
            const distance = widget.getDistance().toFixed(2);
            setDistance(distance);
        });
    };
    const updateHandleShape = (handleId) => {
        // const e = document.getElementById(`idh${handleId}`);
        // const shape = e.options[e.selectedIndex].value;
        let shape = '';
        if (handleId === 1) {
            shape = idh1;
        } else {
            shape = idh2;
        }
        const handle = getHandle[handleId];
        if (handle) {
            handle.setShape(shape);
            lineWidget.updateHandleVisibility(handleId - 1);
            lineWidget.getInteractor().render();
            observeDistance();
        }
    };
    const addWidgetHandle = () => {
        let currentHandle = null;
        widgetManager.releaseFocus(widget);
        widget = vtkLineWidget.newInstance();
        // widget.placeWidget(cube.getOutputData().getBounds());
        currentHandle = widgetManager.addWidget(widget);
        lineWidget = currentHandle;

        getHandle = {
            1: lineWidget.getWidgetState().getHandle1(),
            2: lineWidget.getWidgetState().getHandle2(),
        };

        updateHandleShape(1);
        updateHandleShape(2);

        observeDistance();

        widgetManager.grabFocus(widget);

        currentHandle.onStartInteractionEvent(() => {
            const index = widgetManager.getWidgets().findIndex((cwidget) => {
                if (DeepEqual(currentHandle.getWidgetState(), cwidget.getWidgetState()))
                    return 1;
                return 0;
            });
            getHandle = {
                1: currentHandle.getWidgetState().getHandle1(),
                2: currentHandle.getWidgetState().getHandle2(),
            };
            setWidgetColor(widgetManager.getWidgets()[selectedWidgetIndex], 0.5);
            setWidgetColor(widgetManager.getWidgets()[index], 0.2);
            selectedWidgetIndex = index;
            lineWidget = currentHandle;

            let idh1value = getHandle[1].getShape() === '' ? 'sphere' : getHandle[1].getShape();
            setIdh1(idh1value);
            let idh2value = getHandle[1].getShape() === '' ? 'sphere' : getHandle[2].getShape();
            setIdh2(idh2value);
            let visiH1Checked = lineWidget.getWidgetState().getHandle1().getVisible();
            setVisiH1(visiH1Checked);
            let visiH2Checked = lineWidget.getWidgetState().getHandle2().getVisible();
            setVisiH2(visiH2Checked);
            let txtIptValue = lineWidget.getWidgetState().getText().getText();
            setTxtIpt(txtIptValue);
        });
    };
    const removeWidgetHandle = () => {
        widgetManager.removeWidget(widgetManager.getWidgets()[selectedWidgetIndex]);
        if (widgetManager.getWidgets().length !== 0) {
            selectedWidgetIndex = widgetManager.getWidgets().length - 1;
            setWidgetColor(widgetManager.getWidgets()[selectedWidgetIndex], 0.2);
        }
    };
    const linePosHandle = (value: number) => {
        const subState = lineWidget.getWidgetState().getPositionOnLine();
        subState.setPosOnLine(value / 100);
        lineWidget.placeText();
        renderWindow.render();
    };
    const idh1Handle = (value: string) => {
        setIdh1(value);
        updateHandleShape(1);
    };
    const idh2Handle = (value: string) => {
        setIdh2(value);
        updateHandleShape(2);
    };
    return (
        <div style={{position: 'absolute', top: 0, left: 0, zIndex: 1, background: '#fff'}}>
            <Button onClick={addWidgetHandle}>Add widget</Button>
            <Button onClick={removeWidgetHandle}>Remove widget</Button>
            <span>Distance: {distance}</span>
            <span>text:</span>
            <TextArea rows={2} onChange={txtIptHandle} value={txtIpt} style={{width: '200px'}}/>
            <span>Line position</span>
            <Slider onChange={linePosHandle} style={{width: '100px', display: 'inline-block'}}/>
            <span>Handle1</span>
            <Select value={idh1} onChange={idh1Handle}>
                <Option value="sphere">Sphere</Option>
                <Option value="cone">Cone</Option>
                <Option value="cube">Cube</Option>
                <Option value="triangle">Triangle</Option>
                <Option value="4pointsArrowHead">4 points arrow head</Option>
                <Option value="6pointsArrowHead">6 points arrow head</Option>
                <Option value="star">Star</Option>
                <Option value="disk">Disk</Option>
                <Option value="circle">Circle</Option>
                <Option value="viewFinder">View Finder</Option>
                <Option value="voidSphere">None</Option>
            </Select>
            <Checkbox onChange={visiH1Handle} checked={visiH1} disabled={idh1 === 'voidSphere'}>Visibility</Checkbox>
            <span>Handle2</span>
            <Select value={idh2} onChange={idh2Handle}>
            <Option value="sphere">Sphere</Option>
                <Option value="cone">Cone</Option>
                <Option value="cube">Cube</Option>
                <Option value="triangle">Triangle</Option>
                <Option value="4pointsArrowHead">4 points arrow head</Option>
                <Option value="6pointsArrowHead">6 points arrow head</Option>
                <Option value="star">Star</Option>
                <Option value="disk">Disk</Option>
                <Option value="circle">Circle</Option>
                <Option value="viewFinder">View Finder</Option>
                <Option value="voidSphere">None</Option>
            </Select>
            <Checkbox onChange={visiH2Handle} checked={visiH2} disabled={idh2 === 'voidSphere'}>Visibility</Checkbox>
        </div>
    );
}