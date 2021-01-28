import * as THREE from 'https://unpkg.com/three/build/three.module.js';

import { GLTFLoader } from './lib/GLTFLoader.js';

// Play and stop sound
const App = new Vue({
    el: '#app',

    data: {
        audios: [
        {
            id: 'muscle-car',
            name: 'sound',
            file: new Audio('./assets/audio/crowd.mp3'),
            isPlaying: false
        }
        ]
    },

    methods: {
        play (audio) {
            audio.isPlaying = true;
            audio.file.play();
        },
        
        pause (audio) {
            audio.isPlaying = false;
            audio.file.pause();
            audio.file.currentTime = 0;
        }
    }
});

let container;

let camera, scene, renderer,clock;

let cPosX = 0;
let cPosY = 150;
let cPosZ = 850;

let goal= new THREE.Object3D();

let physicsWorld;

let rigidBodies = [], tmpTrans;

let colGroupField = 1, colGroupBall = 2

let ballObject = null, 
moveDirection = { left: 0, right: 0, forward: 0, back: 0 }
const STATE = { DISABLE_DEACTIVATION : 4 }


Ammo().then( start )
            
function start(){

    tmpTrans = new Ammo.btTransform();

    setupPhysicsWorld();

    init();

    setupEventHandlers();

    animate();

}


function setupPhysicsWorld(){

    let collisionConfiguration  = new Ammo.btDefaultCollisionConfiguration(),
        dispatcher              = new Ammo.btCollisionDispatcher(collisionConfiguration),
        overlappingPairCache    = new Ammo.btDbvtBroadphase(),
        solver                  = new Ammo.btSequentialImpulseConstraintSolver();

    physicsWorld           = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
    physicsWorld.setGravity(new Ammo.btVector3(0, -300, 0));

}


function init() { 

    container = document.createElement( 'div' );
    document.body.appendChild( container );

    clock = new THREE.Clock();

    const loader = new GLTFLoader();

    let quat = {x: 0, y: 0, z: 0, w: 1};
    let mass = 0;

    const textureLoader = new THREE.TextureLoader();


    //////// SCENE

    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x03c2fc );
    scene.add( new THREE.AmbientLight( 0xFFFFFF ) );


    //////// CAMERA

    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 2000 );
    const pointLight = new THREE.PointLight( 0xFFFFFF, 1 );
    camera.add( pointLight );
    scene.add( camera );
    

    //////////// GROUND FLOOR

    let fieldPos = {x: 0, y: 0, z: 0};
    let fieldScale = {x: 2000, y: 0.1, z: 2000};
    let fieldQuat = {x: 0, y: 0, z: 0, w: 1};
    let fieldMass = 0;



    const groundTexture = textureLoader.load( './assets/texture/grasslight-big.jpg' );
    groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set( 25, 25 );
    groundTexture.anisotropy = 16;
    groundTexture.encoding = THREE.sRGBEncoding;

    const groundMaterial = new THREE.MeshLambertMaterial( { map: groundTexture } );

    let field = new THREE.Mesh( new THREE.BoxBufferGeometry(), groundMaterial );
    field.position.set(fieldPos.x,fieldPos.y,fieldPos.z);
    field.scale.set(fieldScale.x,fieldScale.y,fieldScale.z);
    field.receiveShadow = true;

    let fieldTransform = new Ammo.btTransform();
    fieldTransform.setIdentity();
    fieldTransform.setOrigin( new Ammo.btVector3( fieldPos.x, fieldPos.y, fieldPos.z ) );
    fieldTransform.setRotation( new Ammo.btQuaternion( fieldQuat.x, fieldQuat.y, fieldQuat.z, fieldQuat.w ) );
    let fieldMotionState = new Ammo.btDefaultMotionState( fieldTransform );

    let fieldColShape = new Ammo.btBoxShape( new Ammo.btVector3( fieldScale.x * 0.5, fieldScale.y * 0.5, fieldScale.z * 0.5 ) );
    fieldColShape.setMargin( 0.05 );

    let fieldLocalInertia = new Ammo.btVector3( 0, 0, 0 );
    fieldColShape.calculateLocalInertia( fieldMass, fieldLocalInertia );

    let fieldRbInfo = new Ammo.btRigidBodyConstructionInfo( fieldMass, fieldMotionState, fieldColShape, fieldLocalInertia );
    let fieldBody = new Ammo.btRigidBody( fieldRbInfo );

    fieldBody.setFriction(4); 
    fieldBody.setRollingFriction(100);

    physicsWorld.addRigidBody( fieldBody ,colGroupField,colGroupBall);
    

    /////////// BALL

    let ballPos = {x: 0, y: 100, z: 600};
    let ballScale = {x: 1, y: 1, z: 1 };
    let ballRadius = 30;
    let ballQuat = {x: 0, y: 0, z: 0, w: 1};
    let ballMass = 10;

    let ball = ballObject = new THREE.Mesh(new THREE.SphereGeometry(ballRadius,32, 32), new THREE.MeshPhongMaterial({color: 0xff0505}))
    
    ball.scale.set(ballScale.x,ballScale.y,ballScale.z);
    ball.position.set(ballPos.x,ballPos.y,ballPos.z);

    let ballTransform = new Ammo.btTransform();
    ballTransform.setIdentity();
    ballTransform.setOrigin( new Ammo.btVector3( ballPos.x, ballPos.y, ballPos.z ) );
    ballTransform.setRotation( new Ammo.btQuaternion( ballQuat.x, ballQuat.y, ballQuat.z, ballQuat.w ) );
    let ballMotionState = new Ammo.btDefaultMotionState( ballTransform );

    let ballColShape = new Ammo.btSphereShape( ballRadius );
    ballColShape.setMargin( 0.05 );

    let ballLocalInertia = new Ammo.btVector3( 0, 0, 0 );
    ballColShape.calculateLocalInertia( ballMass, ballLocalInertia );

    let ballRbInfo = new Ammo.btRigidBodyConstructionInfo( ballMass, ballMotionState, ballColShape, ballLocalInertia );
    let ballBody = new Ammo.btRigidBody( ballRbInfo );

    ballBody.setFriction(4);
    ballBody.setRollingFriction(100);

    ballBody.setActivationState( STATE.DISABLE_DEACTIVATION );

    physicsWorld.addRigidBody( ballBody,colGroupBall,colGroupField);
    
    ball.userData.physicsBody = ballBody;
    
    rigidBodies.push(ball);


    ////////////// GOAL

    loader.load(
        
        './assets/obj/football_goal/scene.gltf',
        
        function ( gltf ) {
            field = gltf.scene.children[0];
            field.material = new THREE.MeshLambertMaterial();
            goal.add(field)
        }
    );


    let goalPos = {x: 0, y: 0, z: 0};
    let goalScale = {x: 0.1, y: 0.1, z: 0.1};

    goal.scale.set(goalScale.x,goalScale.y,goalScale.z);
    goal.position.set(goalPos.x,goalPos.y,goalPos.z);


    //////// RENDER

    scene.add(goal);
    scene.add(ball);
    scene.add(field);

    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild( renderer.domElement );

    window.addEventListener( 'resize', onWindowResize, false );
    window.addEventListener( 'orientationchange', onWindowResize, false );

}

function animate() {

    let deltaTime = clock.getDelta();

    moveBall();

    updatePhysics( deltaTime );

    render();

    checkPos(ballObject.position);

    requestAnimationFrame( animate );

}

function checkPos(pos) {
    const pass=false;
    if (pos.z<0 && !pass) {
        alert("Ceci est un but. Bravo.");
        location.reload();
        pass=true; 
    }
    
}

function render() {

    camera.position.x=cPosX;
    camera.position.y=cPosY;
    camera.position.z=cPosZ;
    camera.lookAt( new THREE.Vector3(0,0,0) );
    renderer.render( scene, camera );

}


function updatePhysics( deltaTime ){

    physicsWorld.stepSimulation( deltaTime, 10 );

    for ( let i = 0; i < rigidBodies.length; i++ ) {
        let objThree = rigidBodies[ i ];
        let objAmmo = objThree.userData.physicsBody;
        let ms = objAmmo.getMotionState();
        if ( ms ) {

            ms.getWorldTransform( tmpTrans );
            let p = tmpTrans.getOrigin();
            let q = tmpTrans.getRotation();
            objThree.position.set( p.x(), p.y(), p.z() );
            objThree.quaternion.set( q.x(), q.y(), q.z(), q.w() );

        }
    }

}


function onWindowResize() {

    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}


function setupEventHandlers(){

    window.addEventListener( 'keydown', handleKeyDown, false);
    window.addEventListener( 'keyup', handleKeyUp, false);
    window.addEventListener( 'mousedown', onMouseDown, false);

}

var currentkick=0.6
function handleKeyDown(event){

    let keyCode = event.keyCode;

    switch(keyCode){

        case 32: //W: FORWARD
            moveDirection.forward = 1
            moveDirection.right = Math.random() * (0.80 + 0.800) - 0.800;
            break;
    }
}


function handleKeyUp(event){
    let keyCode = event.keyCode;

    switch(keyCode){
        case 32: //FORWARD
            moveDirection.forward = 0
            moveDirection.right = 0
            break;
    }

}


function moveBall() {

    let scalingFactor = 3000;

    let moveX =  moveDirection.right - moveDirection.left;
    let moveZ =  moveDirection.back - moveDirection.forward;
    let moveY = 0;

    if( moveX == 0 && moveY == 0 && moveZ == 0) return;

    let resultantImpulse = new Ammo.btVector3( moveX, moveY, moveZ )
    resultantImpulse.op_mul(scalingFactor);

    let physicsBody = ballObject.userData.physicsBody;
    physicsBody.setLinearVelocity( resultantImpulse );

}

function onMouseDown ( event ) {

    if (!event.srcElement.outerText) {
        alert("Non, cliquer ne sert à rien.");
    }

}