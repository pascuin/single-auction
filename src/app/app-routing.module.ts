import { NgModule } from '@angular/core'
import { Routes, RouterModule } from '@angular/router'
import { AboutUsComponent } from './pages/about-us/about-us.component'
import { FaqComponent } from './pages/faq/faq.component'

import { LandingComponent } from './pages/landing/landing.component'

const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'about-us', component: AboutUsComponent },
  { path: 'faq', component: FaqComponent },
]

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
