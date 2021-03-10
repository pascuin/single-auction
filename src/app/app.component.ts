import { Component, OnInit } from '@angular/core'
import { Store } from '@ngrx/store'
import { State } from './app.reducer'

import * as actions from './connect-wallet.actions'
import { StoreService } from './services/store/store.service'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  title = 'OneOf'

  constructor(
    private readonly store$: Store<State>,
    private readonly store: StoreService
  ) {}

  ngOnInit() {
    this.store$.dispatch(actions.setupBeacon())
  }
}
