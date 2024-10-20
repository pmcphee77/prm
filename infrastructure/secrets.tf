resource "kubernetes_secret" "docker-registry" {
  metadata {
    name = "regcred"
  }

  data = {
    ".dockerconfigjson" = "${data.template_file.docker_config_script.rendered}"
  }

  type = "kubernetes.io/dockerconfigjson"

  depends_on = [
    azurerm_kubernetes_cluster.aks
  ]
}


data "template_file" "docker_config_script" {
  template = "${file("${path.module}/config.json")}"
  vars = {
    docker-username           = "${var.docker_username}"
    docker-password           = "${var.docker_password}"
    docker-server             = "${var.docker_server}"
    docker-email              = "${var.docker_email}"
    auth                      = base64encode("${var.docker_username}:${var.docker_password}")
  }
}