# Cloud Build triggers and configurations for building Docker images

# Cloud Build trigger for building Mastra app image
resource "google_cloudbuild_trigger" "mastra_app_build" {
  name        = "build-mastra-app"
  description = "Build Mastra app Docker image"
  
  github {
    owner = split("/", var.github_repository)[0]
    name  = split("/", var.github_repository)[1]
    push {
      branch = "^${var.github_branch}$"
    }
  }

  build {
    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "build",
        "-t", "${local.container_image_base_url}/mastra-app:latest",
        "-t", "${local.container_image_base_url}/mastra-app:$COMMIT_SHA",
        "-f", "Dockerfile",
        "."
      ]
    }
    
    step {
      name = "gcr.io/cloud-builders/docker"
      args = ["push", "${local.container_image_base_url}/mastra-app:latest"]
    }
    
    step {
      name = "gcr.io/cloud-builders/docker"
      args = ["push", "${local.container_image_base_url}/mastra-app:$COMMIT_SHA"]
    }

    options {
      logging = "CLOUD_LOGGING_ONLY"
    }
  }

  depends_on = [google_artifact_registry_repository.labs_asp]
}

# Cloud Build trigger for building AI Chatbot image
resource "google_cloudbuild_trigger" "ai_chatbot_build" {
  name        = "build-ai-chatbot"
  description = "Build AI Chatbot Docker image"
  
  github {
    owner = split("/", var.github_repository)[0]
    name  = split("/", var.github_repository)[1]
    push {
      branch = "^${var.github_branch}$"
    }
  }

  build {
    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "build",
        "-t", "${local.container_image_base_url}/ai-chatbot:latest",
        "-t", "${local.container_image_base_url}/ai-chatbot:$COMMIT_SHA",
        "-f", "Dockerfile.ai-chatbot",
        "."
      ]
    }
    
    step {
      name = "gcr.io/cloud-builders/docker"
      args = ["push", "${local.container_image_base_url}/ai-chatbot:latest"]
    }
    
    step {
      name = "gcr.io/cloud-builders/docker"
      args = ["push", "${local.container_image_base_url}/ai-chatbot:$COMMIT_SHA"]
    }

    options {
      logging = "CLOUD_LOGGING_ONLY"
    }
  }

  depends_on = [google_artifact_registry_repository.labs_asp]
}

# Manual Cloud Build for initial deployment
resource "google_cloudbuild_trigger" "manual_build" {
  name        = "manual-build-all-images"
  description = "Manual trigger to build all images for deployment"
  
  github {
    owner = split("/", var.github_repository)[0]
    name  = split("/", var.github_repository)[1]
    push {
      branch = "^${var.github_branch}$"
    }
  }

  build {
    # Build Mastra app
    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "build",
        "-t", "${local.container_image_base_url}/mastra-app:latest",
        "-f", "Dockerfile",
        "."
      ]
    }
    
    step {
      name = "gcr.io/cloud-builders/docker"
      args = ["push", "${local.container_image_base_url}/mastra-app:latest"]
    }

    # Build AI Chatbot
    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "build",
        "-t", "${local.container_image_base_url}/ai-chatbot:latest",
        "-f", "Dockerfile.ai-chatbot",
        "."
      ]
    }
    
    step {
      name = "gcr.io/cloud-builders/docker"
      args = ["push", "${local.container_image_base_url}/ai-chatbot:latest"]
    }

    options {
      logging = "CLOUD_LOGGING_ONLY"
    }
  }

  depends_on = [google_artifact_registry_repository.labs_asp]
}
