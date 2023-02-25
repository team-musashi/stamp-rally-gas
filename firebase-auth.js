// Firebase認証情報
class FirebaseAuth {
  constructor(flavor) {
    const props = PropertiesService.getScriptProperties();
    this.email = props.getProperty(flavor + '_client_email');
    this.key = props.getProperty(flavor + '_private_key').replace(/\\n/g,"\n");
    this.projectId = props.getProperty(flavor + '_project_id');
  }
}