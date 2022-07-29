import {useEffect, useState, useRef} from 'react';
import '@kitware/vtk.js/favicon';
// Load the rendering pieces we want to use (for both WebGL and WebGPU)
import '@kitware/vtk.js/Rendering/Profiles/All';

import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';
import vtkPaintWidget from '@kitware/vtk.js/Widgets/Widgets3D/PaintWidget';
import vtkRectangleWidget from '@kitware/vtk.js/Widgets/Widgets3D/RectangleWidget';
import vtkEllipseWidget from '@kitware/vtk.js/Widgets/Widgets3D/EllipseWidget';
import vtkSplineWidget from '@kitware/vtk.js/Widgets/Widgets3D/SplineWidget';
import vtkInteractorStyleImage from '@kitware/vtk.js/Interaction/Style/InteractorStyleImage';
import vtkHttpDataSetReader from '@kitware/vtk.js/IO/Core/HttpDataSetReader';
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice';
import vtkPaintFilter from '@kitware/vtk.js/Filters/General/PaintFilter';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';
import vtkConeSource from '@kitware/vtk.js/Filters/Sources/ConeSource';

// Force the loading of HttpDataAccessHelper to support gzip decompression
import '@kitware/vtk.js/IO/Core/DataAccessHelper/HttpDataAccessHelper';
import {
  BehaviorCategory,
  ShapeBehavior,
} from '@kitware/vtk.js/Widgets/Widgets3D/ShapeWidget/Constants';
import { ViewTypes } from '@kitware/vtk.js/Widgets/Core/WidgetManager/Constants';
import { vec3 } from 'gl-matrix';
import {Select, Slider, Button} from 'antd';
const {Option} = Select;
import 'antd/dist/antd.less';

export default function PaintWidget() {
    const scene = useRef({});
    const widgets = useRef({});
    const image = useRef({});
    let activeWidget = 'paintWidget';
    // Paint filter
    const painter = vtkPaintFilter.newInstance();

    const [radius, setRadius] = useState(1);
    const [slice, setSlice] = useState(1);
    const [axis, setAxis] = useState('K');
    const [widget, setWidget] = useState('paintWidget');
    const [sliceMin, setSliceMin] = useState(1);
    const [sliceMax, setSliceMax] = useState(132);

    const initializeHandle = (handle) => {
        handle.onStartInteractionEvent(() => {
            painter.startStroke();
        });
        handle.onEndInteractionEvent(() => {
            painter.endStroke();
        });
    };
    const setCamera = (sliceMode, renderer, data) => {
        const ijk = [0, 0, 0];
        const position = [0, 0, 0];
        const focalPoint = [0, 0, 0];
        data.indexToWorld(ijk, focalPoint);
        ijk[sliceMode] = 1;
        data.indexToWorld(ijk, position);
        renderer.getActiveCamera().set({ focalPoint, position });
        renderer.resetCamera();
    };
    const updateControlPanel = (im, ds) => {
        const slicingMode = im.getSlicingMode();
        const extent = ds.getExtent();
        setSliceMin(extent[slicingMode * 2]);
        setSliceMax(extent[slicingMode * 2 + 1]);
    };
    const renderScene = () => {
        const rootContainer = document.getElementById('rootContainer');
        scene.fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
            rootContainer: rootContainer,
            background: [0.1, 0.1, 0.1],
        });
        scene.renderer = scene.fullScreenRenderer.getRenderer();
        scene.renderWindow = scene.fullScreenRenderer.getRenderWindow();
        scene.apiSpecificRenderWindow = scene.fullScreenRenderer.getInteractor().getView();
        scene.camera = scene.renderer.getActiveCamera();
        // setup 2D view
        scene.camera.setParallelProjection(true);
        scene.iStyle = vtkInteractorStyleImage.newInstance();
        scene.iStyle.setInteractionMode('IMAGE_SLICING');
        scene.renderWindow.getInteractor().setInteractorStyle(scene.iStyle);
        // scene.fullScreenRenderer.addController(controlPanel);
        // Widget manager and vtkPaintFilter
        scene.widgetManager = vtkWidgetManager.newInstance();
        scene.widgetManager.setRenderer(scene.renderer);
        // Widgets
        widgets.paintWidget = vtkPaintWidget.newInstance();
        widgets.rectangleWidget = vtkRectangleWidget.newInstance({
            resetAfterPointPlacement: true,
        });
        widgets.ellipseWidget = vtkEllipseWidget.newInstance({
            resetAfterPointPlacement: true,
        });
        widgets.circleWidget = vtkEllipseWidget.newInstance({
            resetAfterPointPlacement: true,
            modifierBehavior: {
                None: {
                    [BehaviorCategory.PLACEMENT]: ShapeBehavior[BehaviorCategory.PLACEMENT].CLICK_AND_DRAG,
                    [BehaviorCategory.POINTS]: ShapeBehavior[BehaviorCategory.POINTS].RADIUS,
                    [BehaviorCategory.RATIO]: ShapeBehavior[BehaviorCategory.RATIO].FREE,
                },
                Control: {
                    [BehaviorCategory.POINTS]: ShapeBehavior[BehaviorCategory.POINTS].DIAMETER,
                },
            },
        });
        widgets.splineWidget = vtkSplineWidget.newInstance({
            resetAfterPointPlacement: true,
        });
        widgets.polygonWidget = vtkSplineWidget.newInstance({
            resetAfterPointPlacement: true,
            resolution: 1,
        });

        scene.paintHandle = scene.widgetManager.addWidget(widgets.paintWidget, ViewTypes.SLICE);
        scene.rectangleHandle = scene.widgetManager.addWidget(widgets.rectangleWidget, ViewTypes.SLICE);
        scene.ellipseHandle = scene.widgetManager.addWidget(widgets.ellipseWidget, ViewTypes.SLICE);
        scene.circleHandle = scene.widgetManager.addWidget(widgets.circleWidget, ViewTypes.SLICE);
        scene.splineHandle = scene.widgetManager.addWidget(widgets.splineWidget, ViewTypes.SLICE);
        scene.polygonHandle = scene.widgetManager.addWidget(widgets.polygonWidget, ViewTypes.SLICE);

        scene.splineHandle.setOutputBorder(true);
        scene.polygonHandle.setOutputBorder(true);

        // 使小部件实例获得焦点;lossFocus使小部件实例释放焦点;hasFocus如果小部件实例保持焦点，则返回 true，否则返回 false
        scene.widgetManager.grabFocus(widgets.paintWidget);

        // Painting
        scene.paintHandle.onStartInteractionEvent(() => {
            painter.startStroke();
            painter.addPoint(widgets.paintWidget.getWidgetState().getTrueOrigin());
        });
        scene.paintHandle.onInteractionEvent(() => {
            painter.addPoint(widgets.paintWidget.getWidgetState().getTrueOrigin());
        });
        initializeHandle(scene.paintHandle);

        scene.rectangleHandle.onEndInteractionEvent(() => {
            const rectangleHandle = scene.rectangleHandle.getWidgetState().getRectangleHandle();
        
            const origin = rectangleHandle.getOrigin();
            const corner = rectangleHandle.getCorner();
        
            if (origin && corner) {
            painter.paintRectangle(origin, corner);
            }
        });
        initializeHandle(scene.rectangleHandle);
        
        scene.ellipseHandle.onEndInteractionEvent(() => {
            const center = scene.ellipseHandle
            .getWidgetState()
            .getEllipseHandle()
            .getOrigin();
            const point2 = scene.ellipseHandle
            .getWidgetState()
            .getPoint2Handle()
            .getOrigin();
        
            if (center && point2) {
            let corner = [];
            if (
                scene.ellipseHandle.isBehaviorActive(
                BehaviorCategory.RATIO,
                ShapeBehavior[BehaviorCategory.RATIO].FIXED
                )
            ) {
                const radius = vec3.distance(center, point2);
                corner = [radius, radius, radius];
            } else {
                corner = [
                center[0] - point2[0],
                center[1] - point2[1],
                center[2] - point2[2],
                ];
            }
        
            painter.paintEllipse(center, corner);
            }
        });
        initializeHandle(scene.ellipseHandle);
        
        scene.circleHandle.onEndInteractionEvent(() => {
            const center = scene.circleHandle
            .getWidgetState()
            .getEllipseHandle()
            .getOrigin();
            const point2 = scene.circleHandle
            .getWidgetState()
            .getPoint2Handle()
            .getOrigin();
        
            if (center && point2) {
                const radius = vec3.distance(center, point2);
                const corner = [radius, radius, radius];
            
                painter.paintEllipse(center, corner);
            }
        });
        initializeHandle(scene.circleHandle);
        
        scene.splineHandle.onEndInteractionEvent(() => {
            const points = scene.splineHandle.getPoints();
            painter.paintPolygon(points);
        
            scene.splineHandle.updateRepresentationForRender();
        });
        initializeHandle(scene.splineHandle);
        
        scene.polygonHandle.onEndInteractionEvent(() => {
            const points = scene.polygonHandle.getPoints();
            painter.paintPolygon(points);
        
            scene.polygonHandle.updateRepresentationForRender();
        });
        initializeHandle(scene.polygonHandle);

        loadImage();
    };
    const loadImage = () => {
        image.imageMapper = vtkImageMapper.newInstance();
        image.actor = vtkImageSlice.newInstance();
        const labelMap = {
            imageMapper: vtkImageMapper.newInstance(),
            actor: vtkImageSlice.newInstance(),
            cfun: vtkColorTransferFunction.newInstance(),
            ofun: vtkPiecewiseFunction.newInstance(),
        };
        // background image pipeline
        image.actor.setMapper(image.imageMapper);
        // labelmap pipeline
        labelMap.actor.setMapper(labelMap.imageMapper);
        labelMap.imageMapper.setInputConnection(painter.getOutputPort());
        
        // set up labelMap color and opacity mapping
        labelMap.cfun.addRGBPoint(1, 0, 0, 1); // label "1" will be blue
        labelMap.ofun.addPoint(0, 0); // our background value, 0, will be invisible
        labelMap.ofun.addPoint(1, 1); // all values above 1 will be fully opaque
        
        labelMap.actor.getProperty().setRGBTransferFunction(labelMap.cfun);
        labelMap.actor.getProperty().setPiecewiseFunction(labelMap.ofun);
        // opacity is applied to entire labelmap
        labelMap.actor.getProperty().setOpacity(0.5);
        const reader = vtkHttpDataSetReader.newInstance({ fetchGzip: true });
        // https://kitware.github.io/vtk-js/data/volume/LIDC2.vti
        reader.setUrl(`https://kitware.github.io/vtk-js/data/volume/LIDC2.vti`, { loadData: true }).then(() => {
            const data = reader.getOutputData();
            image.data = data;
            // set input data
            image.imageMapper.setInputData(data);
            // add actors to renderers
            scene.renderer.addViewProp(image.actor);
            scene.renderer.addViewProp(labelMap.actor);
            // update paint filter
            painter.setBackgroundImage(image.data);
            // don't set to 0, since that's our empty label color from our pwf
            painter.setLabel(1);
            // set custom threshold
            // painter.setVoxelFunc((bgValue, idx) => bgValue < 145);
            // default slice orientation/mode and camera view
            const sliceMode = vtkImageMapper.SlicingMode.K;
            image.imageMapper.setSlicingMode(sliceMode);
            image.imageMapper.setSlice(0);
            painter.setSlicingMode(sliceMode);
            // set 2D camera position
            setCamera(sliceMode, scene.renderer, image.data);
            updateControlPanel(image.imageMapper, data);
            // set text display callback
            scene.circleHandle.onInteractionEvent(() => {
                const worldBounds = scene.circleHandle.getBounds();
                const text = `radius: ${(
                    vec3.distance(
                    [worldBounds[0], worldBounds[2], worldBounds[4]],
                    [worldBounds[1], worldBounds[3], worldBounds[5]]
                    ) / 2
                ).toFixed(2)}`;
                widgets.circleWidget.getWidgetState().getText().setText(text);
            });

            scene.splineHandle.setHandleSizeInPixels(2 * Math.max(...image.data.getSpacing()));
            scene.splineHandle.setFreehandMinDistance(4 * Math.max(...image.data.getSpacing()));
            scene.polygonHandle.setHandleSizeInPixels(2 * Math.max(...image.data.getSpacing()));
            scene.polygonHandle.setFreehandMinDistance(4 * Math.max(...image.data.getSpacing()));

            const update = () => {
                const slicingMode = image.imageMapper.getSlicingMode() % 3;

                if (slicingMode > -1) {
                    const ijk = [0, 0, 0];
                    const position = [0, 0, 0];
                    // position
                    ijk[slicingMode] = image.imageMapper.getSlice();
                    data.indexToWorld(ijk, position);

                    widgets.paintWidget.getManipulator().setUserOrigin(position);
                    widgets.rectangleWidget.getManipulator().setUserOrigin(position);
                    widgets.ellipseWidget.getManipulator().setUserOrigin(position);
                    widgets.circleWidget.getManipulator().setUserOrigin(position);
                    widgets.splineWidget.getManipulator().setUserOrigin(position);
                    widgets.polygonWidget.getManipulator().setUserOrigin(position);

                    painter.setSlicingMode(slicingMode);

                    scene.paintHandle.updateRepresentationForRender();
                    scene.rectangleHandle.updateRepresentationForRender();
                    scene.ellipseHandle.updateRepresentationForRender();
                    scene.circleHandle.updateRepresentationForRender();
                    scene.splineHandle.updateRepresentationForRender();
                    scene.polygonHandle.updateRepresentationForRender();

                    // update labelMap layer
                    labelMap.imageMapper.set(image.imageMapper.get('slice', 'slicingMode'));

                    // update UI
                    setSliceMax(data.getDimensions()[slicingMode] - 1);
                }
            };
            image.imageMapper.onModified(update);
            // trigger initial update
            update();
            readyAll();
        });
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
    // UI logic
    const radiuHandle = (value: number) => {
        widgets.paintWidget.setRadius(value);
        painter.setRadius(value);
        setRadius(value);
    };
    const sliceHandle = (value: number) => {
        image.imageMapper.setSlice(value);
        setSlice(value);
    };
    const axisHandle = (value: string) => {
        const sliceMode = 'IJKXYZ'.indexOf(value) % 3;
        image.imageMapper.setSlicingMode(sliceMode);
        painter.setSlicingMode(sliceMode);

        const direction = [0, 0, 0];
        direction[sliceMode] = 1;
        scene.paintHandle.getWidgetState().getHandle().setDirection(direction);

        setCamera(sliceMode, scene.renderer, image.data);
        scene.renderWindow.render();
        setAxis(value);
    };
    const widgetHandle = (value: string) => {
        activeWidget = value;
        scene.widgetManager.grabFocus(widgets[activeWidget]);

        scene.paintHandle.setVisibility(activeWidget === 'paintWidget');
        scene.paintHandle.updateRepresentationForRender();

        scene.splineHandle.reset();
        scene.splineHandle.setVisibility(activeWidget === 'splineWidget');
        scene.splineHandle.updateRepresentationForRender();

        scene.polygonHandle.reset();
        scene.polygonHandle.setVisibility(activeWidget === 'polygonWidget');
        scene.polygonHandle.updateRepresentationForRender();

        setWidget(value);
    };
    const focusHandle = () => {
        scene.widgetManager.grabFocus(widgets[activeWidget]);
    };
    const undoHandle = () => {
        painter.undo();
    };
    const redoHandle = () => {
        painter.redo();
    };
    const saveHandle = () => {
        console.log(scene);
        // https://github.com/Kitware/vtk-js/issues/812
        // const stateToSave = {
        //     actors: scene.renderer.getActors().map(a => a.getState()),
        //     camera: scene.renderer.getActiveCamera().getState()
        // };
        // console.log(stateToSave);
        // console.log(scene.renderer.getState());
        // const coneSource = vtkConeSource.newInstance();
        // const source = coneSource.getOutputData().getPointData().getScalars().getData();
        // console.log(source);
        const fileContents = image.data;
        const blob = new Blob([fileContents], {type: 'text/plain'});
        const a = window.document.createElement('a');
        a.href = window.URL.createObjectURL(blob, {type: 'text/plain'});
        a.download = 'LIDC2.vti';
        document.body.appendChild(a);
        a.click(); 
        window.URL.revokeObjectURL(a.href);
        document.body.removeChild(a);  
    };
    useEffect(() => {
        renderScene();
        // loadImage();
        // readyAll();
        window.addEventListener('resize', readyAll);
    }, []);
    return (
        <div>
            <div style={{position: 'absolute', top: 0, left: 0, zIndex: 1, background: '#fff'}}>
                <span>Radius Scale</span>
                <Slider value={radius} step={1} min={1} max={200} onChange={radiuHandle} style={{width: '100px', display: 'inline-block'}}/>
                <span>Slice</span>
                <Slider value={slice} step={1} min={sliceMin} max={sliceMax} onChange={sliceHandle} style={{width: '100px', display: 'inline-block'}}/>
                <span>Slice Axis</span>
                <Select value={axis} onChange={axisHandle}>
                    <Option value="I">I</Option>
                    <Option value="J">J</Option>
                    <Option value="K">K</Option>
                </Select>
                <Select value={widget} onChange={widgetHandle}>
                    <Option value="paintWidget">paintWidget</Option>
                    <Option value="rectangleWidget">rectangleWidget</Option>
                    <Option value="ellipseWidget">ellipseWidget</Option>
                    <Option value="circleWidget">circleWidget</Option>
                    <Option value="splineWidget">splineWidget</Option>
                    <Option value="polygonWidget">polygonWidget</Option>
                </Select>
                <Button onClick={focusHandle}>Grab focus</Button>
                <Button onClick={undoHandle}>Undo</Button>
                <Button onClick={redoHandle}>Redo</Button>
                <Button onClick={saveHandle}>Save</Button>
            </div>
            <div id="rootContainer"></div>
        </div>
    );
}