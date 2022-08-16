import {useEffect, useState, useRef} from 'react';
import '@kitware/vtk.js/favicon';
// Load the rendering pieces we want to use (for both WebGL and WebGPU)
import '@kitware/vtk.js/Rendering/Profiles/All';
// Force the loading of HttpDataAccessHelper to support gzip decompression
import '@kitware/vtk.js/IO/Core/DataAccessHelper/HttpDataAccessHelper';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';
import vtkRectangleWidget from '@kitware/vtk.js/Widgets/Widgets3D/RectangleWidget';
import vtkEllipseWidget from '@kitware/vtk.js/Widgets/Widgets3D/EllipseWidget';
import vtkInteractorStyleImage from '@kitware/vtk.js/Interaction/Style/InteractorStyleImage';
import vtkHttpDataSetReader from '@kitware/vtk.js/IO/Core/HttpDataSetReader';
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice';
import vtkSphere from '@kitware/vtk.js/Common/DataModel/Sphere';
import vtkXMLImageDataReader from '@kitware/vtk.js/IO/XML/XMLImageDataReader';
import vtkXMLImageDataWriter from '@kitware/vtk.js/IO/XML/XMLImageDataWriter';
import vtkXMLWriter from '@kitware/vtk.js/IO/XML/XMLWriter';
import {
  BehaviorCategory,
  ShapeBehavior,
  TextPosition,
} from '@kitware/vtk.js/Widgets/Widgets3D/ShapeWidget/Constants';
import { VerticalTextAlignment } from '@kitware/vtk.js/Widgets/SVG/SVGLandmarkRepresentation/Constants';
import { ViewTypes } from '@kitware/vtk.js/Widgets/Core/WidgetManager/Constants';
import { vec3 } from 'gl-matrix';
import DeepEqual from 'deep-equal';

import {Select, Slider, Button, Row, Col} from 'antd';
const {Option} = Select;
import 'antd/dist/antd.less';

export default function ShapeWidget() {
    const scene = useRef({});
    const widgets = useRef({});
    const image = useRef({});
    let activeWidget = 'ellipseWidget';

    const [sliceMin, setSliceMin] = useState(0);
    const [sliceMax, setSliceMax] = useState(132);
    const [slice, setSlice] = useState(1);
    const [axis, setAxis] = useState('K');
    const [widget, setWidget] = useState('ellipseWidget');
    const [widgetVisible, setWidgetVisible] = useState(true);
    let selectedWidgetIndex = 0;

    const resetWidgets = () => {
        scene.rectangleHandle.reset();
        scene.ellipseHandle.reset();
        scene.circleHandle.reset();
        const slicingMode = image.imageMapper.getSlicingMode() % 3;
        updateWidgetsVisibility(null, slicingMode);
        scene.widgetManager.grabFocus(widgets[activeWidget]);
    };
    const updateWidgetVisibility = (widget, slicePos, i, widgetIndex) => {
        /* testing if the widget is on the slice and has been placed to modify visibility */
        const widgetVisibility = !scene.widgetManager.getWidgets()[widgetIndex].getPoint1() || widget.getWidgetState().getPoint1Handle().getOrigin()[i] === slicePos[i];
        return widget.setVisibility(widgetVisibility);
    };
    const updateWidgetsVisibility = (slicePos, slicingMode) => {
        updateWidgetVisibility(widgets.rectangleWidget, slicePos, slicingMode, 0);
        updateWidgetVisibility(widgets.ellipseWidget, slicePos, slicingMode, 1);
        updateWidgetVisibility(widgets.circleWidget, slicePos, slicingMode, 2);
    };
    const setCamera = (sliceMode, renderer, data) => {
        const ijk = [0, 0, 0];
        const position = [0, 0, 0];
        const focalPoint = [0, 0, 0];
        const viewUp = sliceMode === 1 ? [0, 0, 1] : [0, 1, 0];
        data.indexToWorld(ijk, focalPoint);
        ijk[sliceMode] = 1;
        data.indexToWorld(ijk, position);
        renderer.getActiveCamera().set({ focalPoint, position, viewUp });
        renderer.resetCamera();
    };
    const updateControlPanel = (im, ds) => {
        const slicingMode = im.getSlicingMode();
        const extent = ds.getExtent();
        setSliceMin(extent[slicingMode * 2]);
        setSliceMax(extent[slicingMode * 2 + 1]);
    };
    const renderScene = () => {
        scene.fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
            rootContainer: document.body,
            background: [0.1, 0.1, 0.1],
        });
        scene.renderer = scene.fullScreenRenderer.getRenderer();
        scene.renderWindow = scene.fullScreenRenderer.getRenderWindow();
        scene.openGLRenderWindow = scene.fullScreenRenderer.getApiSpecificRenderWindow();
        scene.camera = scene.renderer.getActiveCamera();
        // setup 2D view
        scene.camera.setParallelProjection(true);
        scene.iStyle = vtkInteractorStyleImage.newInstance();
        scene.iStyle.setInteractionMode('IMAGE_SLICING');
        scene.renderWindow.getInteractor().setInteractorStyle(scene.iStyle);
        // Widget manager
        scene.widgetManager = vtkWidgetManager.newInstance();
        scene.widgetManager.setRenderer(scene.renderer);
        // Widgets
        widgets.rectangleWidget = vtkRectangleWidget.newInstance({
            resetAfterPointPlacement: true,
        });
        widgets.ellipseWidget = vtkEllipseWidget.newInstance({
            modifierBehavior: {
                None: {
                    [BehaviorCategory.PLACEMENT]: ShapeBehavior[BehaviorCategory.PLACEMENT].CLICK_AND_DRAG,
                    [BehaviorCategory.POINTS]: ShapeBehavior[BehaviorCategory.POINTS].CORNER_TO_CORNER,
                    [BehaviorCategory.RATIO]: ShapeBehavior[BehaviorCategory.RATIO].FREE,
                },
            },
        });
        widgets.circleWidget = vtkEllipseWidget.newInstance({
            modifierBehavior: {
                None: {
                [BehaviorCategory.PLACEMENT]: ShapeBehavior[BehaviorCategory.PLACEMENT].CLICK_AND_DRAG,
                [BehaviorCategory.POINTS]: ShapeBehavior[BehaviorCategory.POINTS].RADIUS,
                [BehaviorCategory.RATIO]: ShapeBehavior[BehaviorCategory.RATIO].FREE,
                },
            },
        });
        // Make a large handle for demo purpose
        widgets.circleWidget.getWidgetState().getPoint1Handle().setScale1(20);
        widgets.circleWidget.getWidgetState().setTextPosition([
            TextPosition.MAX,
            TextPosition.CENTER,
            TextPosition.CENTER,
        ]);
        
        scene.rectangleHandle = scene.widgetManager.addWidget(widgets.rectangleWidget, ViewTypes.SLICE);
        scene.rectangleHandle.setHandleVisibility(false);
        scene.rectangleHandle.setTextProps({
            ...scene.rectangleHandle.getTextProps(),
            'text-anchor': 'middle',
            verticalAlign: VerticalTextAlignment.MIDDLE,
        });
        widgets.rectangleWidget.getWidgetState().setTextPosition([
            TextPosition.CENTER,
            TextPosition.CENTER,
            TextPosition.CENTER,
        ]);
        scene.ellipseHandle = scene.widgetManager.addWidget(widgets.ellipseWidget, ViewTypes.SLICE);
        scene.ellipseHandle.setTextProps({
            ...scene.ellipseHandle.getTextProps(),
            'text-anchor': 'middle',
            verticalAlign: VerticalTextAlignment.MIDDLE,
        });
        
        scene.circleHandle = scene.widgetManager.addWidget(widgets.circleWidget, ViewTypes.SLICE);
        scene.circleHandle.setGlyphResolution(64);
        // 使小部件实例获得焦点;
        scene.widgetManager.grabFocus(widgets.ellipseWidget);
        widgetHandle(activeWidget);

        loadImage();
    };
    const loadImage = async () => {
        image.imageMapper = vtkImageMapper.newInstance();
        image.actor = vtkImageSlice.newInstance();
        // background image pipeline
        image.actor.setMapper(image.imageMapper);

        // const reader = vtkHttpDataSetReader.newInstance({ fetchGzip: true });
        const reader = vtkXMLImageDataReader.newInstance();
        const response = await fetch('http://172.22.150.28:8000/img/LIDC2.vti');
        const arrayBuffer = await response.arrayBuffer();
        reader.parseAsArrayBuffer(arrayBuffer);

        const writer = vtkXMLImageDataWriter.newInstance();
        writer.setFormat(vtkXMLWriter.FormatTypes.BINARY);
        writer.setInputConnection(reader.getOutputPort());

        const writerReader = vtkXMLImageDataReader.newInstance();
        // reader.setUrl(`https://kitware.github.io/vtk-js/data/volume/LIDC2.vti`, { loadData: true }).then(() => {
        debugger
            const data = reader.getOutputData();
            const fileContents = writer.write(data);
            // Try to read it back.
            const textEncoder = new TextEncoder();
            writerReader.parseAsArrayBuffer(textEncoder.encode(fileContents));
            image.data = data;
            // set input data
            image.imageMapper.setInputData(data);
            // add actors to renderers
            scene.renderer.addViewProp(image.actor);
            // default slice orientation/mode and camera view
            const sliceMode = vtkImageMapper.SlicingMode.K;
            image.imageMapper.setSlicingMode(sliceMode);
            image.imageMapper.setSlice(0);
            // set 2D camera position
            setCamera(sliceMode, scene.renderer, image.data);
            updateControlPanel(image.imageMapper, data);
            scene.rectangleHandle.getRepresentations()[1].setDrawBorder(true);
            scene.rectangleHandle.getRepresentations()[1].setDrawFace(false);
            scene.rectangleHandle.getRepresentations()[1].setOpacity(1);
            scene.circleHandle.getRepresentations()[1].setDrawBorder(true);
            scene.circleHandle.getRepresentations()[1].setDrawFace(false);
            scene.circleHandle.getRepresentations()[1].setOpacity(1);
            scene.ellipseHandle.getRepresentations()[1].setDrawBorder(true);
            scene.ellipseHandle.getRepresentations()[1].setDrawFace(false);
            scene.ellipseHandle.getRepresentations()[1].setOpacity(1);

            // set text display callback
            scene.ellipseHandle.onInteractionEvent(() => {
                // const worldBounds = scene.ellipseHandle.getBounds();
                // const { average, minimum, maximum } = image.data.computeHistogram(worldBounds, vtkSphere.isPointIn3DEllipse);
                // const text = `average: ${average.toFixed(0)} \nmin: ${minimum} \nmax: ${maximum} `;
                // widgets.ellipseWidget.getWidgetState().getText().setText(text);
            });

            scene.circleHandle.onInteractionEvent(() => {
                const worldBounds = scene.circleHandle.getBounds();
                const text = `radius: ${(vec3.distance([worldBounds[0], worldBounds[2], worldBounds[4]], [worldBounds[1], worldBounds[3], worldBounds[5]]) / 2).toFixed(2)}`;
                widgets.circleWidget.getWidgetState().getText().setText(text);
            });

            scene.rectangleHandle.onInteractionEvent(() => {
                const worldBounds = scene.rectangleHandle.getBounds();
                const dx = Math.abs(worldBounds[0] - worldBounds[1]);
                const dy = Math.abs(worldBounds[2] - worldBounds[3]);
                const dz = Math.abs(worldBounds[4] - worldBounds[5]);
                const perimeter = 2 * (dx + dy + dz);
                const area = dx * dy + dy * dz + dz * dx;
                const text = `perimeter: ${perimeter.toFixed(1)}mm\narea: ${area.toFixed(1)}mm²`;
                widgets.rectangleWidget.getWidgetState().getText().setText(text);
            });

            const update = () => {
                const slicingMode = image.imageMapper.getSlicingMode() % 3;
                if (slicingMode > -1) {
                    const ijk = [0, 0, 0];
                    const slicePos = [0, 0, 0];
                    // position
                    ijk[slicingMode] = image.imageMapper.getSlice();
                    data.indexToWorld(ijk, slicePos);

                    widgets.rectangleWidget.getManipulator().setUserOrigin(slicePos);
                    widgets.ellipseWidget.getManipulator().setUserOrigin(slicePos);
                    widgets.circleWidget.getManipulator().setUserOrigin(slicePos);

                    updateWidgetsVisibility(slicePos, slicingMode);
                    scene.renderWindow.render();
                    // update UI
                    setSliceMax(data.getDimensions()[slicingMode] - 1);
                }
            };
            image.imageMapper.onModified(update);

            // download
            const blob = new Blob([fileContents], { type: 'text/plain' });
            const a = window.document.createElement('a');
            a.href = window.URL.createObjectURL(blob, { type: 'text/plain' });
            a.download = 'LIDC2.vti';
            a.text = 'Download';
            a.style.position = 'absolute';
            a.style.left = '50%';
            a.style.bottom = '10px';
            document.body.appendChild(a);
            a.style.background = 'white';
            a.style.padding = '5px';
            // trigger initial update
            update();
            readyAll();
        // });
    };
    const readyHandle = (scope, picking = false) => {
        scope.renderer.resetCamera();
        scope.fullScreenRenderer.resize();
        if (picking) {
            scope.widgetManager.enablePicking();
        } else {
            scope.widgetManager.disablePicking();
        }
    };
    const readyAll = () => {
        readyHandle(scene, true);
    };
    // UI
    const sliceHandle = (value: number) => {
        image.imageMapper.setSlice(value);
        setSlice(value);
    }
    const axisHandle = (value: string) => {
        const sliceMode = 'IJKXYZ'.indexOf(value) % 3;
        image.imageMapper.setSlicingMode(sliceMode);

        setCamera(sliceMode, scene.renderer, image.data);
        resetWidgets();
        scene.renderWindow.render();

        setAxis(value);
    };
    const widgetHandle = (value: string) => {
        // For demo purpose, hide ellipse handles when the widget loses focus
        // if (activeWidget === 'ellipseWidget') {
        //     widgets.ellipseWidget.setHandleVisibility(false);
        // }
        scene.widgetManager.grabFocus(widgets[value]);
        activeWidget = value;
        // if (activeWidget === 'ellipseWidget') {
        //     widgets.ellipseWidget.setHandleVisibility(true);
        //     scene.ellipseHandle.updateRepresentationForRender();
        // }

        setWidget(value);
        // let currentHandle = scene.widgetManager.addWidget(widgets[value]);
        // currentHandle.onStartInteractionEvent(() => {
        //     const index = scene.widgetManager.getWidgets().findIndex((cwidget) => {
        //         return DeepEqual(currentHandle.getWidgetState(), cwidget.getWidgetState());
        //     });
        //     setWidgetColor(scene.widgetManager.getWidgets()[selectedWidgetIndex], 0.5);
        //     setWidgetColor(scene.widgetManager.getWidgets()[index], 0.2);
        // });
    };
    const resetHandle = () => {
        resetWidgets();
        scene.renderWindow.render();
    };
    const setWidgetColor = (currentWidget, color) => {
        currentWidget.getWidgetState().getPoint1Handle().setColor(color);
        currentWidget.getWidgetState().getPoint2Handle().setColor(color);
    };
    const delHandle = () => {
        const widgets = scene.widgetManager.getWidgets();
        if (!widgets.length) return;
        scene.widgetManager.removeWidget(widgets[widgets.length - 1]);
        
        // const focusWidget = scene.widgetManager.grabFocus();
        // let selectedWidgetIndex = scene.widgetManager.getWidgets().findIndex((cwidget) => {
        //     return DeepEqual(focusWidget.getWidgetState(), cwidget.getWidgetState());
        // });
        // if (selectedWidgetIndex === -1) {
        //     selectedWidgetIndex = scene.widgetManager.getWidgets().length - 1;
        // }
        // scene.widgetManager.removeWidget(scene.widgetManager.getWidgets()[selectedWidgetIndex]);
    };
    const visibleToggle = (widgetVisible) => {
        const allWidgets = scene.widgetManager.getWidgets();
        allWidgets.forEach(widget => {
            widget.setVisibility(!widgetVisible);
        });
        scene.renderWindow.render();
        setWidgetVisible(!widgetVisible);
    };
    useEffect(() => {
        renderScene();
        
        window.addEventListener('resize', readyAll);
    }, []);
    return (
        <div>
            <div
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    backgroundColor: 'white',
                    zIndex: 1,
                    padding: '10px',
                    width: '300px'
                }}
            >
                <Row>
                    <Col span={12}>Slice #</Col>
                    <Col span={12}>
                        <Slider value={slice} step={1} min={sliceMin} max={sliceMax} onChange={sliceHandle}/>
                    </Col>
                </Row>
                <Row>
                    <Col span={12}>Slice Axis</Col>
                    <Col span={12}>
                        <Select value={axis} onChange={axisHandle}>
                            <Option value="I">I</Option>
                            <Option value="J">J</Option>
                            <Option value="K">K</Option>
                        </Select>
                    </Col>
                </Row>
                <Row>
                    <Col span={12}>wdiget</Col>
                    <Col span={12}>
                        <Select value={widget} onChange={widgetHandle}> 
                            <Option value="rectangleWidget">rectangleWidget</Option> 
                            <Option value="ellipseWidget">ellipseWidget</Option> 
                            <Option value="circleWidget">circleWidget</Option> 
                        </Select> 
                    </Col>
                </Row>
                <Row>
                    <Col span={8}>
                        <Button onClick={resetHandle}>Reset</Button>
                    </Col>
                    <Col span={8}>
                        <Button onClick={delHandle}>删除</Button>
                    </Col>
                    <Col span={8}>
                        <Button onClick={() => visibleToggle(widgetVisible)}>{widgetVisible ? '隐藏':'显示'}</Button>
                    </Col>
                </Row>
            </div>
        </div>
    );
}