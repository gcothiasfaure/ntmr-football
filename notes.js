let goalTransform = new Ammo.btTransform();
goalTransform.setIdentity();
goalTransform.setOrigin( new Ammo.btVector3( goalPos.x, goalPos.y, goalPos.z ) );
goalTransform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) );
let goalMotionState = new Ammo.btDefaultMotionState( goalTransform );

let goalColShape = new Ammo.btBoxShape( new Ammo.btVector3( goalScale.x * 0.5, goalScale.y * 0.5, goalScale.z * 0.5 ) );
goalColShape.setMargin( 0.05 );

let goalLocalInertia = new Ammo.btVector3( 0, 0, 0 );
goalColShape.calculateLocalInertia( mass, goalLocalInertia );

let goalRbInfo = new Ammo.btRigidBodyConstructionInfo( mass, goalMotionState, goalColShape, goalLocalInertia );
let goalBody = new Ammo.btRigidBody( goalRbInfo );

physicsWorld.addRigidBody( goalBody );