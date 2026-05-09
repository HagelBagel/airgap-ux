import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { router } from './router'
import { configureTransformersRuntime } from './services/ai/transformersRuntime'
import './styles/base.css'
import App from './App.vue'

// Apply @huggingface/transformers env settings before any model code runs.
configureTransformersRuntime()

createApp(App).use(createPinia()).use(router).mount('#app')
